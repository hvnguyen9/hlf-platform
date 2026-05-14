import prisma from "@/server/prisma";
import { getLatestQuotes } from "@/lib/alpaca";
import {
  paramsByType,
  type AssignmentRiskParams,
  type LotPriceBreachParams,
  type ProfitTargetParams,
  type RollOpportunityParams,
  type WatchlistBreachParams,
} from "./types";
import type { AlertConfig, StockLot, Trade } from "@/generated/prisma/client";

// Delivery is in-app toast only since 2026-05-13 (push was dropped). The
// engine writes AlertEvent rows; the client polls /api/alerts/events to
// surface them as sonner toasts + history list.

// Don't re-fire an alert for the same config more than once per dedup window.
// Tunable; 30 min is conservative for wheel timeframes.
const DEDUP_WINDOW_MS = 30 * 60 * 1000;

interface ScanSummary {
  configsEvaluated: number;
  fired: number;
  skippedDedup: number;
  skippedDisabled: number;
  errors: string[];
  elapsedMs: number;
}

export async function runAlertScan(): Promise<ScanSummary> {
  const startedAt = Date.now();
  const errors: string[] = [];

  // ─── Load all enabled configs ──────────────────────────────────────────────
  const configs = await prisma.alertConfig.findMany({ where: { enabled: true } });
  if (configs.length === 0) {
    return {
      configsEvaluated: 0,
      fired: 0,
      skippedDedup: 0,
      skippedDisabled: 0,
      errors: [],
      elapsedMs: Date.now() - startedAt,
    };
  }

  // ─── Determine which symbols we need quotes for ────────────────────────────
  const tradeIds = Array.from(
    new Set(configs.map((c) => c.tradeId).filter((id): id is string => Boolean(id))),
  );
  const trades = tradeIds.length
    ? await prisma.trade.findMany({ where: { id: { in: tradeIds } } })
    : [];
  const tradeById = new Map(trades.map((t) => [t.id, t]));

  const lotIds = Array.from(
    new Set(configs.map((c) => c.stockLotId).filter((id): id is string => Boolean(id))),
  );
  const lots = lotIds.length
    ? await prisma.stockLot.findMany({ where: { id: { in: lotIds } } })
    : [];
  const lotById = new Map(lots.map((l) => [l.id, l]));

  const watchlistTickers = configs
    .map((c) => c.watchlistTicker)
    .filter((t): t is string => Boolean(t));
  const tradeTickers = trades.map((t) => t.ticker);
  const lotTickers = lots.map((l) => l.ticker);
  const symbols = Array.from(
    new Set([...watchlistTickers, ...tradeTickers, ...lotTickers]),
  );

  const quotes = symbols.length ? await getLatestQuotes(symbols) : new Map<string, number>();

  // ─── Evaluate each config ──────────────────────────────────────────────────
  const now = Date.now();
  let fired = 0;
  let skippedDedup = 0;
  let skippedDisabled = 0;

  // Group pending pushes by userId — one push per (user, config fire) but we
  // commit AlertEvents in a batch at the end.
  const pendingFires: Array<{
    config: AlertConfig;
    message: string;
    price: number;
  }> = [];

  for (const config of configs) {
    try {
      // Dedup check
      if (config.lastFiredAt && now - config.lastFiredAt.getTime() < DEDUP_WINDOW_MS) {
        skippedDedup += 1;
        continue;
      }

      const fire = evaluateConfig(config, tradeById, lotById, quotes);
      if (fire === "disabled") {
        skippedDisabled += 1;
        continue;
      }
      if (!fire) continue;

      pendingFires.push({
        config,
        message: fire.message,
        price: fire.price,
      });
    } catch (err) {
      errors.push(
        `config ${config.id} (${config.type}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ─── Persist (delivery is the client-side toast poller) ──────────────────
  for (const item of pendingFires) {
    try {
      await prisma.$transaction([
        prisma.alertEvent.create({
          data: {
            configId: item.config.id,
            userId: item.config.userId,
            message: item.message,
            priceAtFire: item.price,
          },
        }),
        prisma.alertConfig.update({
          where: { id: item.config.id },
          data: { lastFiredAt: new Date() },
        }),
      ]);
      fired += 1;
    } catch (err) {
      errors.push(
        `persist ${item.config.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    configsEvaluated: configs.length,
    fired,
    skippedDedup,
    skippedDisabled,
    errors,
    elapsedMs: Date.now() - startedAt,
  };
}

// ─── Evaluators ──────────────────────────────────────────────────────────────

type EvalResult = { message: string; price: number } | null | "disabled";

function evaluateConfig(
  config: AlertConfig,
  tradeById: Map<string, Trade>,
  lotById: Map<string, StockLot>,
  quotes: Map<string, number>,
): EvalResult {
  const schema = paramsByType[config.type];
  const parsed = schema.safeParse(config.params);
  if (!parsed.success) return null;

  if (config.type === "WATCHLIST_BREACH") {
    if (!config.watchlistTicker) return null;
    const price = quotes.get(config.watchlistTicker.toUpperCase());
    if (price === undefined) return null;
    return evalWatchlistBreach(
      config.watchlistTicker,
      price,
      parsed.data as WatchlistBreachParams,
    );
  }

  if (config.type === "LOT_PRICE_BREACH") {
    if (!config.stockLotId) return null;
    const lot = lotById.get(config.stockLotId);
    if (!lot) return "disabled";
    if (lot.status !== "OPEN") return "disabled";
    const price = quotes.get(lot.ticker.toUpperCase());
    if (price === undefined) return null;
    return evalLotPriceBreach(lot, price, parsed.data as LotPriceBreachParams);
  }

  // Trade-bound types
  if (!config.tradeId) return null;
  const trade = tradeById.get(config.tradeId);
  if (!trade) return "disabled";
  if (trade.status !== "open") return "disabled";

  const price = quotes.get(trade.ticker.toUpperCase());
  if (price === undefined) return null;

  switch (config.type) {
    case "PROFIT_TARGET":
      return evalProfitTarget(trade, price, parsed.data as ProfitTargetParams);
    case "ASSIGNMENT_RISK":
      return evalAssignmentRisk(trade, price, parsed.data as AssignmentRiskParams);
    case "ROLL_OPPORTUNITY":
      return evalRollOpportunity(trade, price, parsed.data as RollOpportunityParams);
    default:
      return null;
  }
}

function dteOf(trade: Trade): number {
  return Math.max(
    0,
    Math.ceil((trade.expirationDate.getTime() - Date.now()) / 86_400_000),
  );
}

function totalDaysOf(trade: Trade): number {
  return Math.max(
    1,
    Math.ceil(
      (trade.expirationDate.getTime() - trade.createdAt.getTime()) / 86_400_000,
    ),
  );
}

function isShortPut(trade: Trade): boolean {
  return trade.type === "CashSecuredPut" || trade.type === "Put";
}

function isShortCall(trade: Trade): boolean {
  return trade.type === "CoveredCall" || trade.type === "Call";
}

// Profit estimate for a short option position. Time-decay-based — assumes the
// position is OTM and decays linearly with calendar time. Conservative but
// directionally right for wheel timeframes.
function estimateProfitPct(trade: Trade, currentPrice: number): number | null {
  const totalDays = totalDaysOf(trade);
  const dte = dteOf(trade);
  const elapsedFraction = Math.min(1, Math.max(0, (totalDays - dte) / totalDays));

  if (isShortPut(trade)) {
    const otm = (currentPrice - trade.strikePrice) / trade.strikePrice;
    if (otm < 0) return null; // ITM — not at a profit by this approximation
    return Math.round(Math.min(95, elapsedFraction * 95));
  }
  if (isShortCall(trade)) {
    const otm = (trade.strikePrice - currentPrice) / trade.strikePrice;
    if (otm < 0) return null;
    return Math.round(Math.min(95, elapsedFraction * 95));
  }
  return null;
}

function evalProfitTarget(
  trade: Trade,
  price: number,
  params: ProfitTargetParams,
): EvalResult {
  const est = estimateProfitPct(trade, price);
  if (est === null || est < params.profitPct) return null;
  const dte = dteOf(trade);
  const label = isShortPut(trade) ? "CSP" : "CC";
  return {
    message: `${trade.ticker} ${label} $${trade.strikePrice} est. ~${est}% profit — price $${price.toFixed(2)} with ${dte} DTE. Consider closing early.`,
    price,
  };
}

function evalAssignmentRisk(
  trade: Trade,
  price: number,
  params: AssignmentRiskParams,
): EvalResult {
  const dte = dteOf(trade);
  if (dte > params.maxDte) return null;

  if (isShortPut(trade)) {
    const distPct = ((price - trade.strikePrice) / trade.strikePrice) * 100;
    if (distPct > params.withinPctOfStrike) return null;
    const verdict =
      distPct < 0
        ? `is ITM (${Math.abs(distPct).toFixed(1)}% below strike)`
        : `is ${distPct.toFixed(1)}% above strike`;
    return {
      message: `${trade.ticker} CSP $${trade.strikePrice} — price $${price.toFixed(2)} ${verdict} with ${dte} DTE. Watch for assignment.`,
      price,
    };
  }
  if (isShortCall(trade)) {
    const distPct = ((trade.strikePrice - price) / trade.strikePrice) * 100;
    if (distPct > params.withinPctOfStrike) return null;
    const verdict =
      distPct < 0
        ? `is ITM (${Math.abs(distPct).toFixed(1)}% above strike)`
        : `is ${distPct.toFixed(1)}% below strike`;
    return {
      message: `${trade.ticker} CC $${trade.strikePrice} — price $${price.toFixed(2)} ${verdict} with ${dte} DTE. Shares at risk of being called away.`,
      price,
    };
  }
  return null;
}

function evalRollOpportunity(
  trade: Trade,
  price: number,
  params: RollOpportunityParams,
): EvalResult {
  const dte = dteOf(trade);
  if (dte > params.maxDte || dte === 0) return null;

  if (isShortPut(trade)) {
    const otmPct = ((price - trade.strikePrice) / trade.strikePrice) * 100;
    if (otmPct < params.minOtmPct) return null;
    return {
      message: `${trade.ticker} CSP $${trade.strikePrice} — ${dte} DTE, ${otmPct.toFixed(1)}% OTM at $${price.toFixed(2)}. Roll out for more premium.`,
      price,
    };
  }
  if (isShortCall(trade)) {
    const otmPct = ((trade.strikePrice - price) / trade.strikePrice) * 100;
    if (otmPct < params.minOtmPct) return null;
    return {
      message: `${trade.ticker} CC $${trade.strikePrice} — ${dte} DTE, ${otmPct.toFixed(1)}% below strike at $${price.toFixed(2)}. Roll out for more premium.`,
      price,
    };
  }
  return null;
}

function evalWatchlistBreach(
  ticker: string,
  price: number,
  params: WatchlistBreachParams,
): EvalResult {
  if (params.direction === "below" && price > params.triggerPrice) return null;
  if (params.direction === "above" && price < params.triggerPrice) return null;
  const verb = params.direction === "below" ? "dropped to" : "rose to";
  return {
    message: `${ticker} ${verb} $${price.toFixed(2)} (your trigger was $${params.triggerPrice.toFixed(2)}). Consider an entry.`,
    price,
  };
}

function evalLotPriceBreach(
  lot: StockLot,
  price: number,
  params: LotPriceBreachParams,
): EvalResult {
  const avgCost = Number(lot.avgCost);
  if (params.mode === "absolute") {
    if (params.direction === "below" && price > params.triggerPrice) return null;
    if (params.direction === "above" && price < params.triggerPrice) return null;
    const verb = params.direction === "below" ? "dropped to" : "rose to";
    return {
      message: `${lot.ticker} ${verb} $${price.toFixed(2)} (your lot trigger was $${params.triggerPrice.toFixed(2)}, avg cost $${avgCost.toFixed(2)}).`,
      price,
    };
  }
  if (params.mode === "pctBelowAvg") {
    if (!Number.isFinite(avgCost) || avgCost <= 0) return null;
    const threshold = avgCost * (1 - params.pct / 100);
    if (price > threshold) return null;
    const drop = ((avgCost - price) / avgCost) * 100;
    return {
      message: `${lot.ticker} dropped to $${price.toFixed(2)} — ${drop.toFixed(1)}% below your $${avgCost.toFixed(2)} avg cost.`,
      price,
    };
  }
  // pctAboveAvg
  if (!Number.isFinite(avgCost) || avgCost <= 0) return null;
  const threshold = avgCost * (1 + params.pct / 100);
  if (price < threshold) return null;
  const gain = ((price - avgCost) / avgCost) * 100;
  return {
    message: `${lot.ticker} rose to $${price.toFixed(2)} — ${gain.toFixed(1)}% above your $${avgCost.toFixed(2)} avg cost. Consider taking profit.`,
    price,
  };
}

