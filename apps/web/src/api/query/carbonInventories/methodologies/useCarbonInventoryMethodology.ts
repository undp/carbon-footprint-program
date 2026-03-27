import { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { apiClient } from "@/api/http";
import { carbonInventoryKeys } from "../keys";
import { useAuthorizationHeader } from "../authHeaders";

export const useCarbonInventoryMethodology = (inventoryId: string) => {
  const { headers } = useAuthorizationHeader(inventoryId);

  return useQuery<GetCarbonInventoryMethodologyResponse>({
    queryKey: [...carbonInventoryKeys.methodology(inventoryId), headers],
    queryFn: async () =>
      apiClient
        .get(`carbon-inventories/${inventoryId}/methodology`, { headers })
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!inventoryId,
  });
};
