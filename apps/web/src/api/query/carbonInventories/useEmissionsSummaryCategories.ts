import { useQuery } from "@tanstack/react-query";
import type { GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useEmissionsSummaryCategories = (id: string) => {
  return useQuery<GetEmissionsSummaryCategoriesResponse>({
    queryKey: carbonInventoryKeys.emissionsSummaryCategories(id),
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/emissions-summary/categories`)
        .json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
};
