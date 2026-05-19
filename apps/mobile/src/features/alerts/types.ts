// Alert config + event shapes. Mirrors wheel-tracker's Prisma schema and
// route response wrappers ({ configs: [...] }, { events: [...] }).

export type AlertType =
  | "PROFIT_TARGET"
  | "ASSIGNMENT_RISK"
  | "ROLL_OPPORTUNITY"
  | "WATCHLIST_BREACH"
  | "LOT_PRICE_BREACH";

export type ProfitTargetParams = { profitPct: number };
export type AssignmentRiskParams = { withinPctOfStrike: number; maxDte: number };
export type RollOpportunityParams = { maxDte: number; minOtmPct: number };
export type WatchlistBreachParams = {
  triggerPrice: number;
  direction: "below" | "above";
};
export type LotPriceBreachParams =
  | { mode: "absolute"; triggerPrice: number; direction: "below" | "above" }
  | { mode: "pctBelowAvg"; pct: number }
  | { mode: "pctAboveAvg"; pct: number };

export type AlertConfig = {
  id: string;
  type: AlertType;
  tradeId: string | null;
  watchlistTicker: string | null;
  stockLotId: string | null;
  params: unknown;
  enabled: boolean;
  lastFiredAt: string | null;
  createdAt: string;
  // Enriched when includeTrade=1
  trade?: {
    id: string;
    ticker: string;
    type: string;
    strikePrice: number;
    expirationDate: string;
    status: string;
    portfolioId: string;
  } | null;
  stockLot?: {
    id: string;
    ticker: string;
    shares: number;
    avgCost: number;
    status: string;
    portfolioId: string;
  } | null;
};

export type AlertEvent = {
  id: string;
  configId: string;
  message: string;
  firedAt: string;
  priceAtFire: number | null;
  config: {
    id: string;
    type: AlertType;
    tradeId: string | null;
    watchlistTicker: string | null;
  };
};

export const TYPE_LABEL: Record<AlertType, string> = {
  PROFIT_TARGET: "Profit target",
  ASSIGNMENT_RISK: "Assignment risk",
  ROLL_OPPORTUNITY: "Roll opportunity",
  WATCHLIST_BREACH: "Price breach",
  LOT_PRICE_BREACH: "Lot price",
};

export function describeConfig(c: AlertConfig): string {
  const p = c.params as Record<string, unknown>;
  switch (c.type) {
    case "PROFIT_TARGET":
      return `≥ ${p.profitPct}% est. profit`;
    case "ASSIGNMENT_RISK":
      return `within ${p.withinPctOfStrike}% of strike, DTE ≤ ${p.maxDte}`;
    case "ROLL_OPPORTUNITY":
      return `DTE ≤ ${p.maxDte}, OTM ≥ ${p.minOtmPct}%`;
    case "WATCHLIST_BREACH":
      return `${p.direction === "above" ? "rises to" : "drops to"} $${p.triggerPrice}`;
    case "LOT_PRICE_BREACH": {
      const mode = p.mode as string;
      if (mode === "absolute") {
        return `${p.direction === "above" ? "rises to" : "drops to"} $${p.triggerPrice}`;
      }
      if (mode === "pctBelowAvg") return `drops ${p.pct}% below avg`;
      if (mode === "pctAboveAvg") return `rises ${p.pct}% above avg`;
      return "configured";
    }
  }
}
