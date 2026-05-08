import useSWR from "swr";
import type { SavingsGoal } from "@/types";

export function useSavingsGoals() {
  const { data, error, isLoading, mutate } = useSWR<SavingsGoal[]>("/api/fire/savings-goals");
  return { goals: data ?? [], isLoading, isError: error, mutate };
}
