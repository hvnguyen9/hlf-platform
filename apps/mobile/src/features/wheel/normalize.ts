// Prisma Decimal fields serialize to strings (or stringified numbers) over JSON.
// Views want real `number`s so `.toFixed`, formatting, and arithmetic work.
// One coercion pass at the query boundary keeps every screen below honest.

import type {
  ClosedHistoryItem,
  ClosedHistoryResponse,
  PortfolioMetrics,
  StockLot,
  Trade,
} from "./types";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return Number(v);
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  return num(v);
}

export function normalizeTrade(raw: Trade): Trade {
  return {
    ...raw,
    strikePrice: num(raw.strikePrice),
    contractPrice: num(raw.contractPrice),
    entryPrice: numOrNull(raw.entryPrice),
    closingPrice: numOrNull(raw.closingPrice),
    premiumCaptured: numOrNull(raw.premiumCaptured),
    percentPL: numOrNull(raw.percentPL),
  };
}

export function normalizeStockLot(raw: StockLot): StockLot {
  return {
    ...raw,
    avgCost: num(raw.avgCost),
    closePrice: numOrNull(raw.closePrice),
    realizedPnl: numOrNull(raw.realizedPnl),
  };
}

export type StockLotDetail = StockLot & {
  trades?: Array<
    Trade & {
      // detail endpoint includes the linked-trades array
      notes?: string | null;
    }
  >;
  // additional computed fields the lot detail route returns; pass through
  [key: string]: unknown;
};

export function normalizeStockLotDetail(raw: StockLotDetail): StockLotDetail {
  const base = normalizeStockLot(raw as StockLot) as StockLotDetail;
  return {
    ...base,
    trades: raw.trades?.map((t) => normalizeTrade(t)),
  };
}

export function normalizePortfolioMetrics(raw: PortfolioMetrics): PortfolioMetrics {
  return {
    ...raw,
    capitalBase: num(raw.capitalBase),
    currentCapital: num(raw.currentCapital),
    cashAvailable: num(raw.cashAvailable),
    percentCapitalDeployed: num(raw.percentCapitalDeployed),
    capitalUsed: num(raw.capitalUsed),
    capitalUsedOptions: num(raw.capitalUsedOptions),
    capitalUsedStocks: num(raw.capitalUsedStocks),
    totalProfit: num(raw.totalProfit),
    realizedMTD: num(raw.realizedMTD),
    realizedYTD: num(raw.realizedYTD),
    potentialPremium: num(raw.potentialPremium),
    avgPLPercent: numOrNull(raw.avgPLPercent),
    winRate: numOrNull(raw.winRate),
    avgDaysInTrade: numOrNull(raw.avgDaysInTrade),
    biggestPosition: raw.biggestPosition
      ? {
          ...raw.biggestPosition,
          strikePrice: num(raw.biggestPosition.strikePrice),
          contractPrice: num(raw.biggestPosition.contractPrice),
        }
      : null,
    nextExpirations: raw.nextExpirations.map((e) => ({
      ...e,
      strikePrice: num(e.strikePrice),
      locked: num(e.locked),
    })),
  };
}

function normalizeClosedHistoryItem(item: ClosedHistoryItem): ClosedHistoryItem {
  if (item.kind === "trade") {
    return {
      ...item,
      strikePrice: num(item.strikePrice),
      contractPrice: num(item.contractPrice),
      closingPrice: numOrNull(item.closingPrice),
      premiumCaptured: numOrNull(item.premiumCaptured),
      percentPL: numOrNull(item.percentPL),
      entryPrice: numOrNull(item.entryPrice),
    };
  }
  return {
    ...item,
    avgCost: num(item.avgCost),
    closePrice: numOrNull(item.closePrice),
    realizedPnl: numOrNull(item.realizedPnl),
  };
}

export function normalizeClosedHistory(raw: ClosedHistoryResponse): ClosedHistoryResponse {
  return {
    ...raw,
    totalPremium: num(raw.totalPremium),
    avgPercentPL: numOrNull(raw.avgPercentPL),
    items: raw.items.map(normalizeClosedHistoryItem),
  };
}
