import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { methodologyKeys } from "./keys";
import { apiClient } from "@/api/http/client";
import { GetCarbonInventoryMethodologyResponse } from "@repo/types";

export const useMethodology = (carbonInventoryId: string) => {
  return useQuery<GetCarbonInventoryMethodologyResponse>({
    queryKey: methodologyKeys.detail(carbonInventoryId),
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${carbonInventoryId}/methodology`)
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: Boolean(carbonInventoryId),
  });
};
