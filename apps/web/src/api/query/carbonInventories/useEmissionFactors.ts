import { useQuery } from "@tanstack/react-query";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useEmissionFactors = (id: string) => {
  return useQuery<GetEmissionFactorsResponse>({
    queryKey: carbonInventoryKeys.emissionFactors(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/emission-factors`).json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
