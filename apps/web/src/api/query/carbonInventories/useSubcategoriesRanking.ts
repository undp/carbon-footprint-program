import { useQuery } from "@tanstack/react-query";
import type { GetSubcategoriesRankingResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useSubcategoriesRanking = (id: string) => {
  return useQuery<GetSubcategoriesRankingResponse>({
    queryKey: carbonInventoryKeys.subcategoriesRanking(id),
    queryFn: () =>
      apiClient.get(`carbon-inventories/${id}/subcategories-ranking`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
