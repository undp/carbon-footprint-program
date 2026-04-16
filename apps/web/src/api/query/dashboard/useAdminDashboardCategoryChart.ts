import { useQuery } from "@tanstack/react-query";
import type { GetAdminDashboardCategoryChartResponse } from "@repo/types";
import { dashboardKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminDashboardCategoryChart = (year?: number) => {
  return useQuery<GetAdminDashboardCategoryChartResponse>({
    queryKey: dashboardKeys.adminCategoryChart(year),
    queryFn: () => {
      const searchParams = year !== undefined ? `?year=${year}` : "";
      return apiClient
        .get(`admin/dashboard/category-chart${searchParams}`)
        .json<GetAdminDashboardCategoryChartResponse>();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
