import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { apiClient } from "@/api/http";
import { carbonInventoryKeys } from "../keys";

export const useCarbonInventoryMethodology = (inventoryId: string) =>
  useQuery<GetCarbonInventoryMethodologyResponse>({
    queryKey: carbonInventoryKeys.methodology(inventoryId),
    queryFn: async () =>
      apiClient.get(`carbon-inventories/${inventoryId}/methodology`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!inventoryId,
  });
