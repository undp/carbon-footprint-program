import { useQuery } from "@tanstack/react-query";
import type { GetAdminDashboardKpisResponse } from "@repo/types";
import { dashboardKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminDashboardKpis = (year?: number) => {
  return useQuery<GetAdminDashboardKpisResponse>({
    queryKey: dashboardKeys.adminKpis(year),
    queryFn: () => {
      const searchParams = year !== undefined ? `?year=${year}` : "";
      return apiClient
        .get(`admin/dashboard/kpis${searchParams}`)
        .json<GetAdminDashboardKpisResponse>();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
