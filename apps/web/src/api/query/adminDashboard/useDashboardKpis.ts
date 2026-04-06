import { useQuery } from "@tanstack/react-query";
import { AdminDashboardKpisResponse } from "@repo/types";
import { adminDashboardKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useDashboardKpis = (year?: number) => {
  return useQuery<AdminDashboardKpisResponse>({
    queryKey: adminDashboardKeys.kpis(year),
    queryFn: async () => {
      const searchParams: Record<string, string> = {};
      if (year !== undefined) {
        searchParams.year = String(year);
      }
      return apiClient.get("admin/dashboard/kpis", { searchParams }).json();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
