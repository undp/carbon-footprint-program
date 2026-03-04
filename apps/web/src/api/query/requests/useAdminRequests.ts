import { useQuery } from "@tanstack/react-query";
import { GetAllAdminRequestsResponse } from "@repo/types";
import { requestsKeys } from "./keys.js";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminRequests = () => {
  return useQuery<GetAllAdminRequestsResponse>({
    queryKey: [...requestsKeys.adminAll],
    queryFn: () =>
      apiClient.get("admin/requests").json<GetAllAdminRequestsResponse>(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
