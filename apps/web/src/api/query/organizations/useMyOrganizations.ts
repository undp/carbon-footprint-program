import { organizationKeys } from "./keys";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";
import { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { apiClient } from "@/api/http";

export const useMyOrganizations = () =>
  useQuery<GetMyOrganizationsSelectorOptionsResponse>({
    queryKey: organizationKeys.all,
    queryFn: async () => apiClient.get("app/organizations/me").json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
