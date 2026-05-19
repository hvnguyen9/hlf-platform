// Shape of /api/portal/summary on the portal. Kept narrow to what the
// mobile Home tab actually renders — extend as we add fields.

export type RecentAlert = {
  id: string;
  message: string;
  firedAt: string;
  type: string;
  tradeId: string | null;
  watchlistTicker: string | null;
};

export type WheelSummary = {
  openTradeCount: number;
  openLotCount: number;
  mtdRealizedPnl: number;
  ytdRealizedPnl: number;
  alertsToday: number;
  alertsThisWeek: number;
  recentAlerts: RecentAlert[];
};

export type BookkeepingSummary = {
  mtdNet: number;
  mtdIncome: number;
  mtdExpenses: number;
  ytdNet: number;
};

export type BudgetSummary = {
  mtdSpent: number;
  monthlyBudgetTotal: number;
  remaining: number;
  fireScorePct: number | null;
};

export type PortalSummaryResponse = {
  user: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
  wheel: WheelSummary | null;
  bookkeeping: BookkeepingSummary | null;
  budget: BudgetSummary | null;
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
  };
};
