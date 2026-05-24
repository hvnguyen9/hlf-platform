// Calendar-events lookup against Yahoo Finance's v10 quoteSummary endpoint.
//
// Why Yahoo: Alpaca's free IEX feed doesn't expose corporate-action data.
// Yahoo's quoteSummary returns the next earnings date AND the ex-dividend
// date in a single response, no API key required. The endpoint is
// unofficial — Yahoo doesn't publish a stable contract — so we treat it as
// best-effort: any failure (rate limit, network, schema change) returns an
// empty map and the caller renders without a calendar row.
//
// Used by the portal-summary endpoint to power Dashboard's "Next 7 days"
// lookahead. Cached per-ticker with a 6h TTL — earnings + ex-div dates
// don't change intraday and a stale-but-cheap read is much better than
// hitting Yahoo on every page load.

export interface CalendarEvent {
  ticker: string;
  /** First upcoming earnings date if available, otherwise null. */
  earningsDate: Date | null;
  /** Upcoming ex-dividend date if available, otherwise null. */
  exDividendDate: Date | null;
}

interface CachedEntry {
  fetchedAt: number;
  event: CalendarEvent;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, CachedEntry>();

// Browser-ish User-Agent — Yahoo's v10 endpoint rejects empty / bot UAs.
const FETCH_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "application/json",
};

// Yahoo's v10 response shape — we destructure conservatively because the
// schema isn't published and fields drift. Anything missing → null.
interface YahooEpoch {
  raw?: number;
  fmt?: string;
}
interface YahooCalendarPayload {
  earnings?: {
    earningsDate?: YahooEpoch[];
  };
  exDividendDate?: YahooEpoch;
  dividendDate?: YahooEpoch;
}
interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: Array<{ calendarEvents?: YahooCalendarPayload }> | null;
    error?: unknown;
  };
}

async function fetchOne(symbol: string): Promise<CalendarEvent> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    symbol,
  )}?modules=calendarEvents`;

  const res = await fetch(url, { headers: FETCH_HEADERS, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Yahoo quoteSummary ${symbol} → HTTP ${res.status}`);
  }
  const json = (await res.json()) as YahooQuoteSummaryResponse;
  const result = json.quoteSummary?.result?.[0];
  const cal = result?.calendarEvents;

  // Earnings: pick the first upcoming timestamp in the array (Yahoo
  // sometimes returns a range of two — start/end of the window).
  let earningsDate: Date | null = null;
  const earnArr = cal?.earnings?.earningsDate;
  if (Array.isArray(earnArr) && earnArr.length > 0) {
    const ts = earnArr[0]?.raw;
    if (typeof ts === "number" && ts > 0) {
      earningsDate = new Date(ts * 1000);
    }
  }

  // Ex-div: prefer exDividendDate. dividendDate is the payment date, which
  // isn't what we want for position-impact warnings.
  let exDividendDate: Date | null = null;
  const exRaw = cal?.exDividendDate?.raw;
  if (typeof exRaw === "number" && exRaw > 0) {
    exDividendDate = new Date(exRaw * 1000);
  }

  return { ticker: symbol, earningsDate, exDividendDate };
}

export async function getCalendarEvents(
  symbols: string[],
): Promise<Map<string, CalendarEvent>> {
  const uniq = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)),
  );
  const out = new Map<string, CalendarEvent>();
  if (uniq.length === 0) return out;

  const now = Date.now();
  const toFetch: string[] = [];

  for (const sym of uniq) {
    const cached = cache.get(sym);
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      out.set(sym, cached.event);
    } else {
      toFetch.push(sym);
    }
  }

  if (toFetch.length === 0) return out;

  // Parallel per-symbol — Yahoo's v10 is one symbol per request.
  // 10 in-flight is a generous ceiling; in practice a single user has
  // far fewer unique tickers.
  const results = await Promise.allSettled(toFetch.map((s) => fetchOne(s)));
  for (let i = 0; i < toFetch.length; i += 1) {
    const sym = toFetch[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      out.set(sym, r.value);
      cache.set(sym, { fetchedAt: now, event: r.value });
    } else {
      // Log but don't throw — calendar is best-effort. Future requests will
      // retry on next page load.
      console.error(`[yahoo-finance] ${sym} failed:`, r.reason);
    }
  }

  return out;
}
