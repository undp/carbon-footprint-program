import { useQuery } from "@tanstack/react-query";
import type { GetMainActivityEquivalenceResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useMainActivityEquivalence = (id: string) => {
  return useQuery<GetMainActivityEquivalenceResponse>({
    queryKey: carbonInventoryKeys.mainActivityEquivalence(id),
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/main-activity-equivalence`)
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
