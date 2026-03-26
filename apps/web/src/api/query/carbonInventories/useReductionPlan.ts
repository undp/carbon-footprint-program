import { useQuery } from "@tanstack/react-query";
import type { GetReductionPlanResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useReductionPlan = (id: string) => {
  return useQuery<GetReductionPlanResponse>({
    queryKey: carbonInventoryKeys.reductionPlan(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/reduction-plan`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
