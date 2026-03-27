import { useQuery } from "@tanstack/react-query";
import type { GetMainActivityEquivalenceResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useAuthorizationHeader } from "./authHeaders";

export const useMainActivityEquivalence = (id: string) => {
  const { headers } = useAuthorizationHeader(id);

  return useQuery<GetMainActivityEquivalenceResponse>({
    queryKey: [...carbonInventoryKeys.mainActivityEquivalence(id), headers],
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/main-activity-equivalence`, { headers })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
