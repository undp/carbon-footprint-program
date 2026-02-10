import { useQuery } from "@tanstack/react-query";
import type { GetSuggestedReductionPlanResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useSuggestedReductionPlan = (id: string) => {
  return useQuery<GetSuggestedReductionPlanResponse>({
    queryKey: carbonInventoryKeys.suggestedReductionPlan(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/suggested-reduction-plan`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
