import useSWR from "swr";
import type { BookkeepingEntry, TaxReserveEntry } from "@/types";

export function useBookkeeping(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const key = `/api/bookkeeping?${params.toString()}`;

  return useSWR<BookkeepingEntry[]>(key);
}

export function useTradingSummary(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const key = `/api/trading-summary?${params.toString()}`;

  return useSWR<{ totalPremium: number; tradeCount: number; byMonth: Record<string, number> }>(
    key,
    (url: string) => fetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`trading-summary: ${res.status}`);
      return res.json();
    }),
  );
}

export function useTaxReserve(year: number) {
  return useSWR<TaxReserveEntry[]>(`/api/tax-reserve?year=${year}`);
}
