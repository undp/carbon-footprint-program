import { useQuery } from "@tanstack/react-query";
import type { GetSectorRankingResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useSectorRanking = (id: string) => {
  return useQuery<GetSectorRankingResponse>({
    queryKey: carbonInventoryKeys.sectorRanking(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/sector-ranking`).json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
