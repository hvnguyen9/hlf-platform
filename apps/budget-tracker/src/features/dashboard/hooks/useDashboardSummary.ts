import useSWR from "swr";
import type { DashboardSummary } from "@/types";

export function useDashboardSummary(year: number, month: number) {
  const { data, error, isLoading, mutate } = useSWR<DashboardSummary>(
    `/api/dashboard/summary?year=${year}&month=${month}`
  );
  return { summary: data, isLoading, isError: error, mutate };
}
