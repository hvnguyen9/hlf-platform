import { useQuery } from "@tanstack/react-query";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PortalSummaryResponse } from "./types";

export function usePortalSummary() {
  const { token, signOut } = useAuth();

  return useQuery<PortalSummaryResponse>({
    queryKey: ["portal-summary"],
    enabled: !!token,
    queryFn: async () => {
      try {
        return await apiGet<PortalSummaryResponse>("/api/portal/summary", token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
        }
        throw err;
      }
    },
  });
}
