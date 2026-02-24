import { useQuery } from "@tanstack/react-query";
import { GetAllOrganizationsResponse } from "@repo/types";
import { organizationsKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminOrganizations = (): {
  data: GetAllOrganizationsResponse | undefined;
  isLoading: boolean;
} => {
  return useQuery<GetAllOrganizationsResponse>({
    queryKey: organizationsKeys.adminAll,
    queryFn: async () => apiClient.get("admin/organizations").json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
