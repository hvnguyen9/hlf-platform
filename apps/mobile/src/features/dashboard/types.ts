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

export type TodayItem = {
  id: string;
  kind: "ALERT" | "EXPIRING" | "OVER_BUDGET";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  ticker?: string;
  timestamp?: string;
  pct?: number;
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
  todayItems: TodayItem[];
  errors: {
    wheel?: string;
    bookkeeping?: string;
    budget?: string;
  };
};
