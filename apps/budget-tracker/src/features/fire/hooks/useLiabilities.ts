import useSWR from "swr";
import type { BtLiability } from "@/types";

export function useLiabilities() {
  const { data, error, isLoading, mutate } = useSWR<BtLiability[]>("/api/fire/liabilities");
  return { liabilities: data ?? [], isLoading, isError: error, mutate };
}
