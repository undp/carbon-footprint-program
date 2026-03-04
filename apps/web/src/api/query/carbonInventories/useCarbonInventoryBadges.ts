import { useQuery } from "@tanstack/react-query";
import { GetCarbonInventoryBadgesResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS, REFETCH_INTERVAL_MS } from "@/config/constants";

export const useCarbonInventoryBadges = (id: string) => {
  return useQuery<GetCarbonInventoryBadgesResponse>({
    queryKey: carbonInventoryKeys.badges(id),
    queryFn: () => apiClient.get(`carbon-inventories/${id}/badges`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
