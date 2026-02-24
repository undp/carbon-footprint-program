import { useQuery } from "@tanstack/react-query";
import { GetOrganizationKpisResponse } from "@repo/types";
import { organizationsKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useAdminOrganizationsKpis = (): {
  data: GetOrganizationKpisResponse | undefined;
  isLoading: boolean;
} => {
  return useQuery<GetOrganizationKpisResponse>({
    queryKey: [...organizationsKeys.adminKpis],
    queryFn: () => apiClient.get("/admin/organizations/kpis").json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
