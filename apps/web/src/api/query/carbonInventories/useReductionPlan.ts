import { useQuery } from "@tanstack/react-query";
import type { GetReductionPlanResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useReductionPlan = (inventoryId?: string) => {
  return useQuery<GetReductionPlanResponse>({
    queryKey: carbonInventoryKeys.reductionPlan(inventoryId),
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${inventoryId}/reduction-plan`)
        .json<GetReductionPlanResponse>(),
    staleTime: STALE_TIME_MS,
    enabled: !!inventoryId,
  });
};
