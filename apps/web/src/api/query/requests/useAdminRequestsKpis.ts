import { useQuery } from "@tanstack/react-query";
import { GetAdminRequestsKpisResponse } from "@repo/types";
import { requestsKeys } from "./keys.js";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminRequestsKpis = (year?: number) => {
  return useQuery<GetAdminRequestsKpisResponse>({
    queryKey: [...requestsKeys.adminKpis, year ?? null],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (year !== undefined) searchParams.set("year", String(year));
      const suffix = searchParams.toString();
      return apiClient
        .get(`admin/requests/kpis${suffix ? `?${suffix}` : ""}`)
        .json<GetAdminRequestsKpisResponse>();
    },
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
