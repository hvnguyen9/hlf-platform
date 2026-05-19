import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AlertConfig, AlertEvent, AlertType } from "./types";

function useAlertsToken() {
  const { token, signOut } = useAuth();
  return { token, signOut };
}

type Filter = {
  tradeId?: string;
  watchlistTicker?: string;
  stockLotId?: string;
  includeTrade?: boolean;
};

function filterQS(filter: Filter): string {
  const parts: string[] = [];
  if (filter.tradeId) parts.push(`tradeId=${encodeURIComponent(filter.tradeId)}`);
  if (filter.watchlistTicker)
    parts.push(`watchlistTicker=${encodeURIComponent(filter.watchlistTicker)}`);
  if (filter.stockLotId)
    parts.push(`stockLotId=${encodeURIComponent(filter.stockLotId)}`);
  if (filter.includeTrade) parts.push("includeTrade=1");
  return parts.length ? `?${parts.join("&")}` : "";
}

export function useAlertConfigs(filter: Filter = {}) {
  const { token, signOut } = useAlertsToken();
  return useQuery<AlertConfig[]>({
    queryKey: ["alerts", "configs", filter],
    enabled: !!token,
    queryFn: async () => {
      try {
        const res = await apiGet<{ configs: AlertConfig[] }>(
          `/api/alerts/configs${filterQS(filter)}`,
          token,
          "wheel",
        );
        return res.configs;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export function useAlertEvents(limit = 50) {
  const { token, signOut } = useAlertsToken();
  return useQuery<AlertEvent[]>({
    queryKey: ["alerts", "events", limit],
    enabled: !!token,
    queryFn: async () => {
      try {
        const res = await apiGet<{ events: AlertEvent[] }>(
          `/api/alerts/events?limit=${limit}`,
          token,
          "wheel",
        );
        return res.events;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
  });
}

export type CreateAlertInput =
  | { type: "PROFIT_TARGET"; tradeId: string; params: { profitPct: number } }
  | {
      type: "ASSIGNMENT_RISK";
      tradeId: string;
      params: { withinPctOfStrike: number; maxDte: number };
    }
  | {
      type: "ROLL_OPPORTUNITY";
      tradeId: string;
      params: { maxDte: number; minOtmPct: number };
    }
  | {
      type: "WATCHLIST_BREACH";
      watchlistTicker: string;
      params: { triggerPrice: number; direction: "below" | "above" };
    }
  | {
      type: "LOT_PRICE_BREACH";
      stockLotId: string;
      params:
        | { mode: "absolute"; triggerPrice: number; direction: "below" | "above" }
        | { mode: "pctBelowAvg"; pct: number }
        | { mode: "pctAboveAvg"; pct: number };
    };

export function useCreateAlert() {
  const { token, signOut } = useAlertsToken();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, CreateAlertInput>({
    mutationFn: async (input) => {
      try {
        return await apiPost("/api/alerts/configs", input, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useToggleAlert() {
  const { token, signOut } = useAlertsToken();
  const qc = useQueryClient();
  return useMutation<
    unknown,
    ApiError,
    { id: string; enabled: boolean },
    { previous: AlertConfig[] | undefined; key: readonly unknown[] }
  >({
    mutationFn: async ({ id, enabled }) => {
      try {
        return await apiPatch(
          `/api/alerts/configs/${id}`,
          { enabled },
          token,
          "wheel",
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onMutate: async ({ id, enabled }) => {
      const key = ["alerts", "configs", { includeTrade: true }];
      await qc.cancelQueries({ queryKey: ["alerts", "configs"] });
      const previous = qc.getQueryData<AlertConfig[]>(key);
      if (previous) {
        qc.setQueryData<AlertConfig[]>(
          key,
          previous.map((c) => (c.id === id ? { ...c, enabled } : c)),
        );
      }
      return { previous, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useDeleteAlert() {
  const { token, signOut } = useAlertsToken();
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: async (id) => {
      try {
        return await apiDelete(`/api/alerts/configs/${id}`, token, "wheel");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) await signOut();
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export type { AlertType };
