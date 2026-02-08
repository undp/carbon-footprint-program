import { useQuery } from "@tanstack/react-query";
import { GetCarbonInventoryResultsResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useEmissionResults = (id: string) => {
  return useQuery<GetCarbonInventoryResultsResponse>({
    queryKey: carbonInventoryKeys.results(id),
    queryFn: () => apiClient.get(`carbon-inventories/${id}/results`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
