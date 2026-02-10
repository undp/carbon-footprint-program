import { useQuery } from "@tanstack/react-query";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useCarbonInventoryMetadata = (id: string) => {
  return useQuery<GetCarbonInventoryMetadataResponse>({
    queryKey: carbonInventoryKeys.metadata(id),
    queryFn: () => apiClient.get(`carbon-inventories/${id}/metadata`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
