// Shapes returned by wheel-tracker's user-scoped API routes that the mobile
// wheel section consumes. Kept narrow to fields the screens actually render.

export type Portfolio = {
  id: string;
  name: string;
  startingCapital: number | null;
  userId?: string;
  createdAt?: string;
};

export type Trade = {
  id: string;
  ticker: string;
  type: string;
  strikePrice: number;
  expirationDate: string;
  contracts: number;
  contractsInitial: number;
  contractsOpen: number;
  contractPrice: number;
  entryPrice: number | null;
  status: "open" | "closed";
  portfolioId: string;
  stockLotId: string | null;
  createdAt: string;
  closedAt?: string | null;
  closingPrice?: number | null;
  premiumCaptured?: number | null;
  percentPL?: number | null;
  closeReason?: string | null;
};

export type StockLot = {
  id: string;
  portfolioId: string;
  ticker: string;
  shares: number;
  avgCost: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  realizedPnl: number | null;
  notes: string | null;
};

export type WatchlistPosition = {
  ticker: string;
  trades: {
    id: string;
    portfolioId: string;
    portfolioName: string;
    type: string;
    strikePrice: number;
    expirationDate: string;
    contractsOpen: number;
    contractPrice: number;
  }[];
  stockLots: {
    id: string;
    portfolioId: string;
    portfolioName: string;
    shares: number;
    avgCost: number;
  }[];
};

export type WatchlistResponse = {
  manual: string[];
  positions: WatchlistPosition[];
};

export type Quote = {
  ticker: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  timestamp?: string;
};

export type QuoteMap = Record<string, Quote>;

export type JournalTrade = {
  id: string;
  kind: "trade" | "stock";
  ticker: string;
  type: string;
  pnl: number;
  portfolioId: string;
  portfolioName: string;
};

export type JournalDay = {
  pnl: number;
  tradeCount: number;
  trades: JournalTrade[];
};

export type PortfolioMetrics = {
  capitalBase: number;
  currentCapital: number;
  cashAvailable: number;
  percentCapitalDeployed: number;
  capitalUsed: number;
  capitalUsedOptions: number;
  capitalUsedStocks: number;
  totalProfit: number;
  realizedMTD: number;
  realizedYTD: number;
  potentialPremium: number;
  avgPLPercent: number | null;
  winRate: number | null;
  avgDaysInTrade: number | null;
  openTradesCount: number;
  biggestPosition: {
    ticker: string;
    type: string;
    strikePrice: number;
    contractsOpen: number;
    contractPrice: number;
  } | null;
  nextExpirations: Array<{
    id: string;
    ticker: string;
    strikePrice: number;
    contracts: number;
    expirationDate: string;
    locked: number;
  }>;
  expiringInSevenDays: number;
  expiringInThirtyDays: number;
};

export type ClosedHistoryItem =
  | {
      kind: "trade";
      id: string;
      portfolioId: string;
      ticker: string;
      type: string;
      strikePrice: number;
      contractsInitial: number;
      contractsOpen: number;
      contractPrice: number;
      closingPrice: number | null;
      premiumCaptured: number | null;
      percentPL: number | null;
      createdAt: string;
      closedAt: string;
      closeReason: string | null;
      entryPrice: number | null;
      expirationDate: string;
    }
  | {
      kind: "stock";
      id: string;
      portfolioId: string;
      ticker: string;
      shares: number;
      avgCost: number;
      closePrice: number | null;
      realizedPnl: number | null;
      openedAt: string;
      closedAt: string;
    };

export type ClosedHistoryResponse = {
  items: ClosedHistoryItem[];
  total: number;
  totalPremium: number;
  avgPercentPL: number | null;
};

export type JournalResponse = {
  notes: string;
  days: Record<string, JournalDay>;
  monthStats: {
    totalPnl: number;
    winRate: number | null;
    tradeCount: number;
    bestDay: { date: string; pnl: number } | null;
    worstDay: { date: string; pnl: number } | null;
  };
};
