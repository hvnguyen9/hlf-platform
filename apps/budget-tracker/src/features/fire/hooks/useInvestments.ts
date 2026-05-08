import useSWR from "swr";
import type { Investment } from "@/types";

export function useInvestments() {
  const { data, error, isLoading, mutate } = useSWR<Investment[]>("/api/fire/investments");
  return { investments: data ?? [], isLoading, isError: error, mutate };
}
