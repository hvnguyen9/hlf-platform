// Shapes returned by each app's /api/internal/v1/portal-summary endpoint.

export type ExpiringTrade = {
  id: string;
  ticker: string;
  type: string;
  strikePrice: number;
  contracts: number;
  expirationDate: string;
  portfolioId: string;
  dte: number;
};

// Top N open option trades with the live quote of the underlying. Portal
// Dashboard renders these as a compact morning snapshot.
export type OpenTradeSnapshot = {
  id: string;
  ticker: string;
  type: string;
  strikePrice: number;
  contracts: number;
  expirationDate: string;
  portfolioId: string;
  portfolioName: string | null;
  dte: number;
  currentPrice: number | null;
  changePct: number | null;
  itm: boolean | null;
};

// Account-wide capital snapshot. Powers the Dashboard's expanded wheel
// P/L card (cash position + deployment + concentration warnings).
export type CapitalConcentration = {
  ticker: string;
  capital: number;
  pct: number;
};

export type CapitalSummary = {
  capitalBase: number;
  currentCapital: number;
  cashAvailable: number;
  capitalDeployed: number;
  capitalDeployedOptions: number;
  capitalDeployedStocks: number;
  percentDeployed: number;
  concentration: CapitalConcentration[];
};

// 7-day forward-looking calendar event — option expiry, earnings, or
// ex-dividend — for any ticker the user has open exposure to. The
// Dashboard's "Next 7 days" section renders these chronologically.
export type UpcomingEventKind = "expiry" | "earnings" | "exDividend";

export type UpcomingEvent = {
  kind: UpcomingEventKind;
  ticker: string;
  date: string;
  daysAway: number;
  // Expiry events carry the trade context so the row can deep-link.
  tradeId?: string;
  portfolioId?: string;
  contracts?: number;
  strikePrice?: number;
  tradeType?: string;
};

// Watchlist row with current quote. Powers the Dashboard's Watchlist card.
export type WatchlistSnapshot = {
  id: string;
  ticker: string;
  currentPrice: number | null;
  changePct: number | null;
  previousClose: number | null;
};

// Top N open stock lots with current price and unrealized P&L. Portal
// Dashboard renders these alongside open trades.
export type OpenLotSnapshot = {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  portfolioId: string;
  portfolioName: string | null;
  currentPrice: number | null;
  changePct: number | null;
  unrealizedPnl: number | null;
  unrealizedPct: number | null;
};

export type WheelSummary = {
  openTradeCount: number;
  openLotCount: number;
  mtdRealizedPnl: number;
  ytdRealizedPnl: number;
  // Optional: returned by wheel-tracker only after the Today-inbox extension
  // ships. Older deployments omit them.
  expiringTrades?: ExpiringTrade[];
  // Optional: returned by wheel-tracker only after the Phase 2 snapshot
  // extension. Older deployments omit them.
  openTrades?: OpenTradeSnapshot[];
  openLots?: OpenLotSnapshot[];
  // Optional: returned by wheel-tracker only after the Phase 3 calendar
  // extension. Older deployments omit it.
  upcomingEvents?: UpcomingEvent[];
  // Optional: returned by wheel-tracker only after the capital-metrics
  // extension. Older deployments omit it. null when there are no portfolios.
  capital?: CapitalSummary | null;
  // Optional: returned by wheel-tracker only after the watchlist-snapshot
  // extension. Older deployments omit it.
  watchlist?: WatchlistSnapshot[];
};

export type MtdExpenseRow = {
  name: string;
  amount: number;
  category: string | null;
  recurring: boolean;
};

export type BookkeepingSummary = {
  mtdNet: number;
  mtdIncome: number;
  mtdExpenses: number;
  ytdNet: number;
  // Optional: returned by bookkeeping only after the trading-rollup extension
  // ships. `mtdIncome` already includes this number; broken out so the portal
  // can show the "of which trading: $X" sub-line.
  mtdTradingPnl?: number;
  ytdTradingPnl?: number;
  // Optional: top 5 MTD expense entries powering the Dashboard's
  // breakdown window.
  mtdTopExpenses?: MtdExpenseRow[];
};

export type OverBudgetCategory = {
  id: string;
  name: string;
  spent: number;
  budget: number;
  pct: number;
};

export type MtdTransactionRow = {
  id: string;
  description: string | null;
  amount: number;
  categoryName: string | null;
  categoryColor: string | null;
  // ISO date for one-time transactions; null for recurring rows since
  // they don't have a single "this is when it hit" date.
  date: string | null;
  // True for recurring transactions (auto-counted monthly), false for
  // actual paid Transaction records.
  recurring: boolean;
};

export type BudgetSummary = {
  mtdSpent: number;
  monthlyBudgetTotal: number;
  remaining: number;
  fireScorePct: number | null;
  // Optional: returned by budget-tracker only after the Today-inbox extension
  // ships. Older deployments omit it.
  overBudgetCategories?: OverBudgetCategory[];
  // Optional: top 5 MTD spending transactions (actual paid items, not
  // category roll-ups). Powers the Dashboard's "what was paid" window.
  mtdTopTransactions?: MtdTransactionRow[];
};

export type PortalSummary = {
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
  };
};
