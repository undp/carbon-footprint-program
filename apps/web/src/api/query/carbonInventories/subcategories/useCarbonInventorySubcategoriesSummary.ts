import { useQuery } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http/client";
import { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";
import { useInventoryUuidHeader } from "../inventoryUuid";

export const useCarbonInventorySubcategoriesSummary = (
  carbonInventoryId: string
) => {
  const { headers } = useInventoryUuidHeader(carbonInventoryId);

  return useQuery<GetCarbonInventorySubcategoriesSummaryResponse>({
    queryKey: [
      ...carbonInventoryKeys.subcategoriesSummary(carbonInventoryId),
      headers,
    ],
    queryFn: async () => {
      return apiClient
        .get(`carbon-inventories/${carbonInventoryId}/subcategories/summary`, {
          headers,
        })
        .json();
    },
    enabled: Boolean(carbonInventoryId),
    refetchOnMount: "always",
  });
};
