import { createClient } from "@alpacahq/typescript-sdk";

// Shared Alpaca client for the whole app. Used by:
//  - the alerts engine (latest-quote scan)
//  - the watchlist /api/quotes route (snapshot + 52-week range)
//  - the watchlist /api/charts route (intraday bars for sparklines)
//
// Free-tier IEX feed; sufficient for wheel-strategy timeframes.

let _client: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!_client) {
    _client = createClient({
      key: process.env.ALPACA_API_KEY,
      secret: process.env.ALPACA_SECRET_KEY,
      baseURL: "https://data.alpaca.markets",
    });
  }
  return _client;
}

const FEED = "iex" as const;

// ─── Latest close (used by alerts engine) ────────────────────────────────────
//
// Returns Map<symbol, latestClose>. Missing symbols are omitted, never null —
// callers can treat absence as "no quote available".

export async function getLatestQuotes(symbols: string[]): Promise<Map<string, number>> {
  const uniq = uniqUpper(symbols);
  if (uniq.length === 0) return new Map();
  try {
    const response = await getClient().getStocksBarsLatest({
      symbols: uniq.join(","),
      feed: FEED,
    });
    const out = new Map<string, number>();
    for (const symbol of uniq) {
      const bar = response.bars?.[symbol];
      if (bar?.c !== undefined) out.set(symbol, bar.c);
    }
    return out;
  } catch (err) {
    console.error("[alpaca] getLatestQuotes failed:", err);
    return new Map();
  }
}

// ─── Full snapshot (used by /api/quotes) ─────────────────────────────────────
//
// Mirrors the QuoteResult shape the watchlist UI consumes — latest price,
// change vs prev close, day high/low, volume, 52-week range, market state.

export type QuoteSnapshot = {
  ticker: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  previousClose: number | null;
  // Alpaca's IEX feed doesn't expose PRE/POST distinction, so the route only
  // returns "REGULAR" or "CLOSED" today — but the type stays string-tolerant
  // so existing UI comparisons keep compiling and a future source could
  // expand the values.
  marketState: string | null;
  volume: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
};

const NULL_SNAPSHOT = (ticker: string): QuoteSnapshot => ({
  ticker,
  price: null,
  change: null,
  changePct: null,
  previousClose: null,
  marketState: null,
  volume: null,
  dayHigh: null,
  dayLow: null,
  fiftyTwoWeekHigh: null,
  fiftyTwoWeekLow: null,
});

export async function getQuoteSnapshots(symbols: string[]): Promise<QuoteSnapshot[]> {
  const uniq = uniqUpper(symbols);
  if (uniq.length === 0) return [];

  // Free IEX tier doesn't expose /v1beta1/stocks/snapshots. We reconstruct
  // the snapshot from three calls that DO work:
  //   - latest 1-min bar → freshest current price during market hours
  //   - last 2 daily bars → today's daily high/low/volume + previous close
  //   - cached 252 daily bars → 52-week range (6h TTL per ticker)
  const [latestBars, dailyByTicker, ranges] = await Promise.all([
    fetchLatestBars(uniq),
    fetchRecentDailyBars(uniq),
    getFiftyTwoWeekRanges(uniq),
  ]);
  const marketOpen = isMarketOpenNow();

  return uniq.map((symbol) => {
    const latest = latestBars.get(symbol);
    const daily = dailyByTicker.get(symbol);
    if (!latest && !daily) return NULL_SNAPSHOT(symbol);

    const todayBar = daily?.today ?? null;
    const prevBar = daily?.previous ?? null;

    // During market hours, show the real-time minute-bar price.
    // After close (and pre-market / weekends / holidays), show the most
    // recent official daily close so the displayed price doesn't keep
    // drifting on stray after-hours ticks — same UX as Yahoo Finance.
    const price = marketOpen
      ? latest?.c ?? todayBar?.c ?? prevBar?.c ?? null
      : todayBar?.c ?? latest?.c ?? prevBar?.c ?? null;
    const previousClose = prevBar?.c ?? null;
    const change =
      price !== null && previousClose !== null ? price - previousClose : null;
    const changePct =
      change !== null && previousClose ? (change / previousClose) * 100 : null;

    const range = ranges.get(symbol);

    return {
      ticker: symbol,
      price,
      change,
      changePct,
      previousClose,
      marketState: marketOpen ? "REGULAR" : "CLOSED",
      volume: todayBar?.v ?? null,
      dayHigh: todayBar?.h ?? null,
      dayLow: todayBar?.l ?? null,
      fiftyTwoWeekHigh: range?.high ?? null,
      fiftyTwoWeekLow: range?.low ?? null,
    };
  });
}

interface DailyBarSimple {
  c: number;
  h: number;
  l: number;
  v: number;
  t: string;
}

async function fetchLatestBars(symbols: string[]): Promise<Map<string, DailyBarSimple>> {
  const out = new Map<string, DailyBarSimple>();
  try {
    const r = await getClient().getStocksBarsLatest({
      symbols: symbols.join(","),
      feed: FEED,
    });
    for (const symbol of symbols) {
      const b = r.bars?.[symbol];
      if (b) out.set(symbol, { c: b.c, h: b.h, l: b.l, v: b.v, t: b.t });
    }
  } catch (err) {
    console.error("[alpaca] getStocksBarsLatest failed:", err);
  }
  return out;
}

async function fetchRecentDailyBars(
  symbols: string[],
): Promise<Map<string, { today: DailyBarSimple | null; previous: DailyBarSimple | null }>> {
  const out = new Map<string, { today: DailyBarSimple | null; previous: DailyBarSimple | null }>();
  // Pull the last ~5 calendar days of daily bars to cover weekends/holidays
  // and still land at least 2 trading sessions for every ticker.
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  try {
    const r = await getClient().getStocksBars({
      symbols: symbols.join(","),
      timeframe: "1Day",
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      limit: 1000,
      feed: FEED,
    });
    const bars = r.bars ?? {};
    for (const symbol of symbols) {
      const list = (bars[symbol] ?? []) as DailyBarSimple[];
      if (list.length === 0) {
        out.set(symbol, { today: null, previous: null });
        continue;
      }
      const sorted = [...list].sort((a, b) => (a.t < b.t ? -1 : 1));
      const today = sorted[sorted.length - 1] ?? null;
      const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
      out.set(symbol, { today, previous });
    }
  } catch (err) {
    console.error("[alpaca] getStocksBars(1Day, recent) failed:", err);
  }
  return out;
}

// ─── Market clock (derived from US/Eastern time) ─────────────────────────────
//
// Approximate — doesn't account for US market holidays (Christmas, July 4th,
// etc.) which would still show as "REGULAR" before the close. Acceptable for
// the watchlist UI; an exact answer would require the Alpaca trade API.

function isMarketOpenNow(): boolean {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minuteStr = parts.find((p) => p.type === "minute")?.value ?? "0";
  const hour = Number(hourStr) % 24;
  const minute = Number(minuteStr);
  const minuteOfDay = hour * 60 + minute;

  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  if (!isWeekday) return false;
  // 9:30am – 4:00pm ET
  return minuteOfDay >= 9 * 60 + 30 && minuteOfDay < 16 * 60;
}

// ─── 52-week range (LRU-cached per ticker, 6h TTL) ──────────────────────────
//
// JS Map preserves insertion order, so "delete then re-set" promotes an entry
// to most-recently-used. When the cache exceeds RANGE_CACHE_MAX, evict from
// the front (least-recently-used). Bounds memory at ~200 tickers regardless
// of how many symbols the user has ever loaded.

interface FiftyTwoWeek {
  high: number;
  low: number;
}

const RANGE_TTL_MS = 6 * 60 * 60 * 1000;
const RANGE_CACHE_MAX = 200;
const _rangeCache = new Map<string, { range: FiftyTwoWeek; expiresAt: number }>();

function rangeCacheGet(symbol: string, now: number): FiftyTwoWeek | null {
  const hit = _rangeCache.get(symbol);
  if (!hit) return null;
  if (hit.expiresAt <= now) {
    _rangeCache.delete(symbol);
    return null;
  }
  // Touch — promote to most-recently-used.
  _rangeCache.delete(symbol);
  _rangeCache.set(symbol, hit);
  return hit.range;
}

function rangeCacheSet(symbol: string, range: FiftyTwoWeek, now: number) {
  _rangeCache.set(symbol, { range, expiresAt: now + RANGE_TTL_MS });
  while (_rangeCache.size > RANGE_CACHE_MAX) {
    const oldest = _rangeCache.keys().next().value;
    if (oldest === undefined) break;
    _rangeCache.delete(oldest);
  }
}

async function getFiftyTwoWeekRanges(symbols: string[]): Promise<Map<string, FiftyTwoWeek>> {
  const out = new Map<string, FiftyTwoWeek>();
  const now = Date.now();
  const missing: string[] = [];

  for (const s of symbols) {
    const cached = rangeCacheGet(s, now);
    if (cached) out.set(s, cached);
    else missing.push(s);
  }

  if (missing.length === 0) return out;

  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  try {
    const r = await getClient().getStocksBars({
      symbols: missing.join(","),
      timeframe: "1Day",
      start: startStr,
      end: endStr,
      limit: 10000,
      feed: FEED,
    });
    const bars = r.bars ?? {};
    for (const s of missing) {
      const list = bars[s] ?? [];
      if (list.length === 0) continue;
      let high = -Infinity;
      let low = Infinity;
      for (const b of list) {
        if (b.h > high) high = b.h;
        if (b.l < low) low = b.l;
      }
      if (Number.isFinite(high) && Number.isFinite(low)) {
        const range = { high, low };
        rangeCacheSet(s, range, now);
        out.set(s, range);
      }
    }
  } catch (err) {
    console.error("[alpaca] getFiftyTwoWeekRanges failed:", err);
  }
  return out;
}

// ─── Intraday bars (used by /api/charts for sparklines) ──────────────────────
//
// Returns 5-min bars for the most recent trading day with enough data points
// (skips weekends / holidays / pre-market gaps).

export interface IntradaySeries {
  closes: number[];
  timestamps: number[];
}

const EMPTY_SERIES: IntradaySeries = { closes: [], timestamps: [] };

export async function getIntradayBars(
  symbols: string[],
): Promise<Map<string, IntradaySeries>> {
  const uniq = uniqUpper(symbols);
  const out = new Map<string, IntradaySeries>();
  if (uniq.length === 0) return out;

  const end = new Date();
  const start = new Date(end.getTime() - 5 * 24 * 60 * 60 * 1000);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  try {
    const r = await getClient().getStocksBars({
      symbols: uniq.join(","),
      timeframe: "5Min",
      start: startStr,
      end: endStr,
      limit: 10000,
      feed: FEED,
    });
    const bars = r.bars ?? {};
    for (const symbol of uniq) {
      const list = bars[symbol] ?? [];
      if (list.length === 0) {
        out.set(symbol, EMPTY_SERIES);
        continue;
      }
      out.set(symbol, mostRecentDayWithEnoughPoints(list));
    }
  } catch (err) {
    console.error("[alpaca] getIntradayBars failed:", err);
    for (const symbol of uniq) out.set(symbol, EMPTY_SERIES);
  }
  return out;
}

function mostRecentDayWithEnoughPoints(
  bars: ReadonlyArray<{ t: string; c: number }>,
): IntradaySeries {
  // Bucket by UTC day; pick the most recent bucket with ≥ 3 points so
  // sparklines have something to draw.
  const buckets = new Map<string, IntradaySeries>();
  for (const b of bars) {
    if (!Number.isFinite(b.c)) continue;
    const dayKey = b.t.slice(0, 10);
    const seconds = Math.floor(new Date(b.t).getTime() / 1000);
    if (!Number.isFinite(seconds)) continue;
    let bucket = buckets.get(dayKey);
    if (!bucket) {
      bucket = { closes: [], timestamps: [] };
      buckets.set(dayKey, bucket);
    }
    bucket.closes.push(b.c);
    bucket.timestamps.push(seconds);
  }
  const sortedDays = [...buckets.keys()].sort().reverse();
  for (const day of sortedDays) {
    const b = buckets.get(day)!;
    if (b.closes.length >= 3) return b;
  }
  return EMPTY_SERIES;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function uniqUpper(symbols: string[]): string[] {
  return Array.from(
    new Set(symbols.map((s) => s.toUpperCase().trim()).filter(Boolean)),
  );
}
