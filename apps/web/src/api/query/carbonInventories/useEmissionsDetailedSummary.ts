import { useQuery } from "@tanstack/react-query";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useEmissionsDetailedSummary = (id: string) => {
  return useQuery<GetEmissionsDetailedSummaryResponse>({
    queryKey: carbonInventoryKeys.emissionsDetailedSummary(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/emissions-summary/full`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
