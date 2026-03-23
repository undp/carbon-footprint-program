import { useQuery } from "@tanstack/react-query";
import type { GetSubcategoriesRankingResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useInventoryUuidHeader } from "./inventoryUuid";

export const useSubcategoriesRanking = (id: string) => {
  const { headers } = useInventoryUuidHeader(id);

  return useQuery<GetSubcategoriesRankingResponse>({
    queryKey: [...carbonInventoryKeys.subcategoriesRanking(id), headers],
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/subcategories-ranking`, { headers })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
