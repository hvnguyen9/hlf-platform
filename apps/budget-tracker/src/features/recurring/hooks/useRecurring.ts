import useSWR from "swr";
import type { RecurringTransaction } from "@/types";

export function useRecurring() {
  const { data, error, isLoading, mutate } = useSWR<RecurringTransaction[]>("/api/recurring");
  return { recurring: data ?? [], isLoading, isError: error, mutate };
}
