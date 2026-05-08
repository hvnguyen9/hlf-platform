import useSWR from "swr";
import type { MonthlyReport } from "@/types";

export function useMonthlyReport(year: number) {
  const { data, error, isLoading } = useSWR<MonthlyReport[]>(
    `/api/reports/monthly?year=${year}`
  );
  return { report: data ?? [], isLoading, isError: error };
}

export function useCategoryBreakdown(year: number, type: "income" | "expense") {
  const { data, error, isLoading } = useSWR<{ categoryId: string | null; name: string; color: string; total: number }[]>(
    `/api/reports/category-breakdown?year=${year}&type=${type}`
  );
  return { breakdown: data ?? [], isLoading, isError: error };
}
