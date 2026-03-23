import { useQuery } from "@tanstack/react-query";
import type { GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import { carbonInventoryKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";
import { useInventoryUuidHeader } from "./inventoryUuid";

export const useEmissionsSummaryCategories = (id: string) => {
  const { headers } = useInventoryUuidHeader(id);

  return useQuery<GetEmissionsSummaryCategoriesResponse>({
    queryKey: [...carbonInventoryKeys.emissionsSummaryCategories(id), headers],
    queryFn: () =>
      apiClient
        .get(`carbon-inventories/${id}/emissions-summary/categories`, {
          headers,
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
};
