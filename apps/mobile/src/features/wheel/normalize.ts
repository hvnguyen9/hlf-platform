// Prisma Decimal fields serialize to strings (or stringified numbers) over JSON.
// Views want real `number`s so `.toFixed`, formatting, and arithmetic work.
// One coercion pass at the query boundary keeps every screen below honest.

import type { StockLot, Trade } from "./types";

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
