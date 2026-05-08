import useSWR from "swr";
import type { FIREProfile } from "@/types";

interface FireProfileResponse {
  profile: FIREProfile | null;
  minAnnualSpend: number;
  budgetMonthly: number;
}

export function useFireProfile() {
  const { data, error, isLoading, mutate } = useSWR<FireProfileResponse>("/api/fire/profile");
  return {
    profile: data?.profile ?? null,
    minAnnualSpend: data?.minAnnualSpend ?? 0,
    budgetMonthly: data?.budgetMonthly ?? 0,
    isLoading,
    isError: error,
    mutate,
  };
}
