// TanStack Query hooks for the wheel section. All call wheel-tracker's
// user-scoped routes with the mobile bearer token. Decimal fields get
// normalized to real numbers before they reach the views.

import { useQuery } from "@tanstack/react-query";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  normalizeClosedHistory,
  normalizePortfolioMetrics,
  normalizeStockLot,
  normalizeStockLotDetail,
  normalizeTrade,
  type StockLotDetail,
} from "./normalize";
import type {
  ClosedHistoryResponse,
  JournalResponse,
  Portfolio,
  PortfolioMetrics,
  QuoteMap,
  StockLot,
  Trade,
  WatchlistResponse,
} from "./types";

function useWheelToken() {
  const { token, signOut } = useAuth();
  return { token, signOut };
}

export function usePortfolios() {
  const { token, signOut } = useWheelToken();
  return useQuery<Portfolio[]>({
    queryKey: ["wheel", "portfolios"],
    enabled: !!token,
    queryFn: async () => {
      try {
        return await apiGet<Portfolio[]>("/api/portfolios", token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useOpenTrades() {
  const { token, signOut } = useWheelToken();
  return useQuery<Trade[]>({
    queryKey: ["wheel", "trades", "open"],
    enabled: !!token,
    queryFn: async () => {
      try {
        const raw = await apiGet<Trade[]>(
          "/api/trades?status=open",
          token,
          "wheel",
        );
        return raw.map(normalizeTrade);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useTrade(id: string | undefined) {
  const { token, signOut } = useWheelToken();
  return useQuery<Trade>({
    queryKey: ["wheel", "trade", id],
    enabled: !!token && !!id,
    queryFn: async () => {
      try {
        const raw = await apiGet<Trade>(`/api/trades/${id}`, token, "wheel");
        return normalizeTrade(raw);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useOpenStockLots() {
  const { token, signOut } = useWheelToken();
  return useQuery<StockLot[]>({
    queryKey: ["wheel", "stocks", "open"],
    enabled: !!token,
    queryFn: async () => {
      try {
        const raw = await apiGet<{ stockLots: StockLot[] }>(
          "/api/stocks?status=open",
          token,
          "wheel",
        );
        return raw.stockLots.map(normalizeStockLot);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useStockLot(id: string | undefined) {
  const { token, signOut } = useWheelToken();
  return useQuery<StockLotDetail>({
    queryKey: ["wheel", "stock", id],
    enabled: !!token && !!id,
    queryFn: async () => {
      try {
        const raw = await apiGet<StockLotDetail>(
          `/api/stocks/${id}`,
          token,
          "wheel",
        );
        return normalizeStockLotDetail(raw);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useWatchlist() {
  const { token, signOut } = useWheelToken();
  return useQuery<WatchlistResponse>({
    queryKey: ["wheel", "watchlist"],
    enabled: !!token,
    queryFn: async () => {
      try {
        return await apiGet<WatchlistResponse>("/api/watchlist", token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useQuotes(tickers: string[]) {
  const { token, signOut } = useWheelToken();
  const key = tickers.join(",");
  return useQuery<QuoteMap>({
    queryKey: ["wheel", "quotes", key],
    enabled: !!token && tickers.length > 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      try {
        return await apiGet<QuoteMap>(
          `/api/quotes?tickers=${encodeURIComponent(key)}`,
          token,
          "wheel",
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function usePortfolioMetrics(id: string | undefined) {
  const { token, signOut } = useWheelToken();
  return useQuery<PortfolioMetrics>({
    queryKey: ["wheel", "portfolio-metrics", id],
    enabled: !!token && !!id,
    queryFn: async () => {
      try {
        const raw = await apiGet<PortfolioMetrics>(
          `/api/portfolios/${id}/metrics`,
          token,
          "wheel",
        );
        return normalizePortfolioMetrics(raw);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useClosedHistory(id: string | undefined, take = 25) {
  const { token, signOut } = useWheelToken();
  return useQuery<ClosedHistoryResponse>({
    queryKey: ["wheel", "closed-history", id, take],
    enabled: !!token && !!id,
    queryFn: async () => {
      try {
        const raw = await apiGet<ClosedHistoryResponse>(
          `/api/portfolios/${id}/closed-history?take=${take}`,
          token,
          "wheel",
        );
        return normalizeClosedHistory(raw);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useJournal(yearMonth: string) {
  const { token, signOut } = useWheelToken();
  return useQuery<JournalResponse>({
    queryKey: ["wheel", "journal", yearMonth],
    enabled: !!token && /^\d{4}-\d{2}$/.test(yearMonth),
    queryFn: async () => {
      try {
        return await apiGet<JournalResponse>(
          `/api/journal/${yearMonth}`,
          token,
          "wheel",
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}
