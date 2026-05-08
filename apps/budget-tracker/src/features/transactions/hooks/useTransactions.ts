import useSWR from "swr";
import type { Transaction } from "@/types";

export function useTransactions(params: {
  year?: number; month?: number; type?: string; categoryId?: string; search?: string;
} = {}) {
  const query = new URLSearchParams();
  if (params.year) query.set("year", String(params.year));
  if (params.month) query.set("month", String(params.month));
  if (params.type && params.type !== "all") query.set("type", params.type);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.search) query.set("search", params.search);

  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    `/api/transactions?${query.toString()}`
  );
  return { transactions: data ?? [], isLoading, isError: error, mutate };
}
