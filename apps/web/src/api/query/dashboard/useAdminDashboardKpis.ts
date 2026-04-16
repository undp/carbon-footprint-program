import { useQuery } from "@tanstack/react-query";
import type { GetAdminDashboardKpisResponse } from "@repo/types";
import { dashboardKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminDashboardKpis = (year?: number) => {
  return useQuery<GetAdminDashboardKpisResponse>({
    queryKey: dashboardKeys.adminKpis(year),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (year !== undefined) searchParams.set("year", String(year));
      const suffix = searchParams.toString();
      return apiClient
        .get(`admin/dashboard/kpis${suffix ? `?${suffix}` : ""}`)
        .json<GetAdminDashboardKpisResponse>();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
