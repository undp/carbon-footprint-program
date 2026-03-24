import { useQuery } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http/client";
import { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";

export const useCarbonInventorySubcategoriesSummary = (
  carbonInventoryId: string
) => {
  return useQuery<GetCarbonInventorySubcategoriesSummaryResponse>({
    queryKey: carbonInventoryKeys.subcategoriesSummary(carbonInventoryId),
    queryFn: async () => {
      return apiClient
        .get(`carbon-inventories/${carbonInventoryId}/subcategories/summary`)
        .json();
    },
    enabled: Boolean(carbonInventoryId),
    refetchOnMount: "always",
  });
};
