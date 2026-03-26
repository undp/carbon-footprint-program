import { useQuery } from "@tanstack/react-query";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useAuthorizationHeader } from "./authHeaders";

export const useEmissionsDetailedSummary = (id: string) => {
  const { headers } = useAuthorizationHeader(id);

  return useQuery<GetEmissionsDetailedSummaryResponse>({
    queryKey: [...carbonInventoryKeys.emissionsDetailedSummary(id), headers],
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/emissions-summary`, { headers })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
