import { useQuery } from "@tanstack/react-query";
import type { GetAdminDashboardSectorChartResponse } from "@repo/types";
import { dashboardKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminDashboardSectorChart = (limit: number, year?: number) => {
  return useQuery<GetAdminDashboardSectorChartResponse>({
    queryKey: dashboardKeys.adminSectorChart(limit, year),
    queryFn: () => {
      const searchParams = new URLSearchParams({ limit: String(limit) });
      if (year !== undefined) searchParams.set("year", String(year));
      return apiClient
        .get(`admin/dashboard/sector-chart?${searchParams.toString()}`)
        .json<GetAdminDashboardSectorChartResponse>();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
