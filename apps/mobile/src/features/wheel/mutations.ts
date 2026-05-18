// Mutations for the wheel write flows: create trade, close trade, sell shares.
// Each one invalidates the wheel cache on success so list views refresh.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
