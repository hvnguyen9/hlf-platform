// Shapes returned by each app's /api/internal/v1/portal-summary endpoint.
//
// Wheel Tracker's portal-summary also returns the alerts inbox fields
// (`alertsToday`, `alertsThisWeek`, `recentAlerts`) since the realtime alerts
// module was rebuilt inside wheel-tracker on 2026-05-13. The standalone
// Stock Alerts app was retired.

export type RecentAlert = {
  id: string;
  message: string;
  firedAt: string;
  type: string;
  tradeId: string | null;
  watchlistTicker: string | null;
};

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

// A wheel-tracker alert config whose threshold is currently satisfied per
// the latest quote — i.e. *now* not historical. The portal's Today inbox
// turns each one into an "act now" row.
export type ActionableConfig = {
  configId: string;
  type: string;
  message: string;
  ticker: string | null;
  tradeId: string | null;
  stockLotId: string | null;
  watchlistTicker: string | null;
  portfolioId: string | null;
  price: number;
  dte: number | null;
};

export type WheelSummary = {
  openTradeCount: number;
  openLotCount: number;
  mtdRealizedPnl: number;
  ytdRealizedPnl: number;
  alertsToday: number;
  alertsThisWeek: number;
  recentAlerts: RecentAlert[];
  // Optional: returned by wheel-tracker only after the Today-inbox extension
  // ships. Older deployments omit them.
  expiringTrades?: ExpiringTrade[];
  actionableConfigs?: ActionableConfig[];
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
};

export type OverBudgetCategory = {
  id: string;
  name: string;
  spent: number;
  budget: number;
  pct: number;
};

export type BudgetSummary = {
  mtdSpent: number;
  monthlyBudgetTotal: number;
  remaining: number;
  fireScorePct: number | null;
  // Optional: returned by budget-tracker only after the Today-inbox extension
  // ships. Older deployments omit it.
  overBudgetCategories?: OverBudgetCategory[];
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
