import { useQuery } from "@tanstack/react-query";
import type { GetSuggestedReductionPlanResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useAuthorizationHeader } from "./authHeaders";

export const useSuggestedReductionPlan = (id: string) => {
  const { headers } = useAuthorizationHeader(id);

  return useQuery<GetSuggestedReductionPlanResponse>({
    queryKey: [...carbonInventoryKeys.suggestedReductionPlan(id), headers],
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/suggested-reduction-plan`, { headers })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
