import { useQuery } from "@tanstack/react-query";
import { STALE_TIME_MS } from "@/config/constants";
import { carbonInventorySubcategoryKeys } from "./keys";
import { apiClient } from "@/api/http/client";
import { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";

export const useCarbonInventorySubcategoriesSummary = (
  carbonInventoryId: string
) => {
  return useQuery<GetCarbonInventorySubcategoriesSummaryResponse>({
    queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
    queryFn: async () => {
      return apiClient
        .get(`carbon-inventories/${carbonInventoryId}/subcategories/summary`)
        .json();
    },
    staleTime: STALE_TIME_MS,
    enabled: Boolean(carbonInventoryId),
  });
};
