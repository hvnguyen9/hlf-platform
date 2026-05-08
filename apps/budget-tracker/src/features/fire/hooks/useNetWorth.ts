import useSWR from "swr";
import type { NetWorthSnapshot } from "@/types";

export function useNetWorth() {
  const { data, error, isLoading, mutate } = useSWR<NetWorthSnapshot[]>("/api/fire/net-worth");
  return { snapshots: data ?? [], isLoading, isError: error, mutate };
}
