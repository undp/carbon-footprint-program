import { useQuery } from "@tanstack/react-query";
import type { GetAdminDashboardCategoryChartResponse } from "@repo/types";
import { dashboardKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminDashboardCategoryChart = (year?: number) => {
  return useQuery<GetAdminDashboardCategoryChartResponse>({
    queryKey: dashboardKeys.adminCategoryChart(year),
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (year !== undefined) searchParams.set("year", String(year));
      const suffix = searchParams.toString();
      return apiClient
        .get(`admin/dashboard/category-chart${suffix ? `?${suffix}` : ""}`)
        .json<GetAdminDashboardCategoryChartResponse>();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
