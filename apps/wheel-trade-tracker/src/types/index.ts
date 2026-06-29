// types/index.ts
import type { PmccBasis } from "@/lib/pmccBasis";

export interface Trade {
  id: string;
  portfolioId: string;
  ticker: string;
  strikePrice: number;
  entryPrice?: number;
  expirationDate: string;
  type: string;
  contracts: number; // legacy field but keeping for backward compatibility with existing data
  contractsInitial: number;
  contractsOpen: number;
  contractPrice: number;
  closingPrice?: number;
  closedAt?: string | null;
  premiumCaptured?: number | null;
  percentPL?: number | null;
  notes?: string | null;
  status: "open" | "closed";
  totalContracts?: number;
  createdAt: string;
  closeReason?: "manual" | "expiredWorthless" | "assigned" | null;
  stockLotId?: string | null;
  // PMCC: set when this covered call is covered by a long call (LEAP) instead
  // of a stock lot. Exactly one of stockLotId / coveringTradeId is set on a CC.
  coveringTradeId?: string | null;
  // Only present on long calls (from GET /api/trades/[id]) — how much covered-
  // call premium has reduced this LEAP's effective cost.
  pmcc?: PmccBasis | null;
}

export interface Portfolio {
  id: string;
  name: string | null;
  startingCapital: number;
  notes?: string | null;
}

export interface CapitalTransaction {
  id: string;
  portfolioId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  note: string | null;
  date: string;
  createdAt: string;
}

export interface Metrics {
  startingCapital: number;
  capitalUsed?: number;
  capitalBase?: number;
  currentCapital?: number;
  cashAvailable?: number;
  winRate: number | null;
  totalProfit: number | null;
  avgPLPercent: number | null;
  percentCapitalDeployed: number | null;
  avgDaysInTrade: number | null;
  potentialPremium?: number | null;
  realizedMTD?: number | null;
  realizedYTD?: number | null;
}

export type StockLotStatus = "OPEN" | "CLOSED";

export type StockLot = {
  id: string;
  portfolioId: string;
  ticker: string;
  shares: number;
  avgCost: string | number; // Prisma Decimal often serializes as string
  status: StockLotStatus;
  openedAt: string;
  closedAt: string | null;
  closePrice: string | number | null;
  realizedPnl: string | number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  trades: Trade[];
  // Optional — only populated by the list endpoint to power Original/Effective
  // basis columns. CC premium is already baked into avgCost (add it back to
  // recover the original purchase price); CSP premium + long-option P&L during
  // the hold window are display-only and never mutate avgCost.
  ccPremiumCaptured?: number;
  cspPremiumDuringHold?: number;
  longOptionPnlDuringHold?: number;
};

export type StocksListResponse = {
  stockLots: StockLot[];
};

export type CreateStockBody = {
  portfolioId: string;
  ticker: string;
  shares: number;
  avgCost: number;
  notes?: string | null;
};

export type CreateStockResponse = {
  stockLot: StockLot;
};