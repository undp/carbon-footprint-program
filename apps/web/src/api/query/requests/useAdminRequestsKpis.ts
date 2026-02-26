import { useQuery } from "@tanstack/react-query";
import { GetAdminRequestsKpisResponse } from "@repo/types";
import { requestsKeys } from "./keys.js";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminRequestsKpis = () => {
  return useQuery<GetAdminRequestsKpisResponse>({
    queryKey: [...requestsKeys.adminKpis],
    queryFn: () =>
      apiClient.get("admin/requests/kpis").json<GetAdminRequestsKpisResponse>(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
