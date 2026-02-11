import { useQuery } from "@tanstack/react-query";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useEmissionsDetailedSummary = (id: string) => {
  return useQuery<GetEmissionsDetailedSummaryResponse>({
    queryKey: carbonInventoryKeys.emissionsDetailedSummary(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/emissions-summary`).json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
