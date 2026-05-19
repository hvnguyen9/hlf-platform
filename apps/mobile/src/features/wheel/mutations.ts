// Mutations for the wheel write flows: create trade, close trade, sell shares.
// Each one invalidates the wheel cache on success so list views refresh.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { WatchlistResponse } from "./types";

export type CreateTradeInput = {
  portfolioId: string;
  ticker: string;
  type: "CashSecuredPut" | "CoveredCall";
  strikePrice: number;
  expirationDate: string;
  contracts: number;
  contractPrice: number;
  entryPrice: number;
  stockLotId?: string;
};

export function useCreateTrade() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, CreateTradeInput>({
    mutationFn: async (input) => {
      try {
        return await apiPost("/api/trades", input, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheel"] });
      qc.invalidateQueries({ queryKey: ["portal-summary"] });
    },
  });
}

export type CloseTradeInput = {
  tradeId: string;
  closingPrice: number;
  closingContracts?: number;
  fullClose?: boolean;
  assignment?: boolean;
  closeReason?: "manual" | "expiredWorthless" | "assigned";
};

export function useCloseTrade() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, CloseTradeInput>({
    mutationFn: async ({ tradeId, ...body }) => {
      try {
        return await apiPatch(`/api/trades/${tradeId}/close`, body, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheel"] });
      qc.invalidateQueries({ queryKey: ["portal-summary"] });
    },
  });
}

export type AddContractsInput = {
  tradeId: string;
  addedContracts: number;
  addedContractPrice: number;
};

export function useAddContracts() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, AddContractsInput>({
    mutationFn: async ({ tradeId, ...body }) => {
      try {
        return await apiPatch(`/api/trades/${tradeId}/add`, body, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheel"] });
    },
  });
}

export type EditTradeInput = {
  tradeId: string;
  notes?: string;
};

export function useEditTrade() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, EditTradeInput>({
    mutationFn: async ({ tradeId, ...body }) => {
      try {
        return await apiPatch(`/api/trades/${tradeId}`, body, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["wheel", "trade", vars.tradeId] });
      qc.invalidateQueries({ queryKey: ["wheel", "trades", "open"] });
    },
  });
}

export type AddSharesInput = {
  stockLotId: string;
  addedShares: number;
  costPerShare: number;
  note?: string;
};

export function useAddShares() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, AddSharesInput>({
    mutationFn: async ({ stockLotId, ...body }) => {
      try {
        return await apiPost(`/api/stocks/${stockLotId}/add`, body, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheel"] });
    },
  });
}

export type EditLotInput = {
  stockLotId: string;
  notes?: string;
};

export function useEditLot() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, EditLotInput>({
    mutationFn: async ({ stockLotId, ...body }) => {
      try {
        return await apiPatch(`/api/stocks/${stockLotId}`, body, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["wheel", "stock", vars.stockLotId] });
      qc.invalidateQueries({ queryKey: ["wheel", "stocks", "open"] });
    },
  });
}

export function useAddWatchTicker() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: async (ticker) => {
      try {
        return await apiPost(
          "/api/watchlist",
          { ticker },
          token,
          "wheel",
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheel", "watchlist"] });
    },
  });
}

export function useRemoveWatchTicker() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<
    unknown,
    ApiError,
    string,
    { previous: WatchlistResponse | undefined }
  >({
    mutationFn: async (ticker) => {
      try {
        return await apiDelete(
          `/api/watchlist/${encodeURIComponent(ticker)}`,
          token,
          "wheel",
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onMutate: async (ticker) => {
      const key = ["wheel", "watchlist"];
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<WatchlistResponse>(key);
      if (previous) {
        qc.setQueryData<WatchlistResponse>(key, {
          ...previous,
          manual: previous.manual.filter((t) => t !== ticker),
        });
      }
      return { previous };
    },
    onError: (_err, _ticker, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(["wheel", "watchlist"], ctx.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["wheel", "watchlist"] });
    },
  });
}

export type SellSharesInput = {
  stockLotId: string;
  closePrice: number;
  sharesToClose?: number;
};

export function useSellShares() {
  const { token, signOut } = useAuth();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, SellSharesInput>({
    mutationFn: async ({ stockLotId, ...body }) => {
      try {
        return await apiPatch(`/api/stocks/${stockLotId}`, body, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wheel"] });
      qc.invalidateQueries({ queryKey: ["portal-summary"] });
    },
  });
}
