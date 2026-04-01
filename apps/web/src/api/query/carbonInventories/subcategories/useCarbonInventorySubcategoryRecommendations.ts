import { useQuery } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http/client";
import { GetCarbonInventorySubcategoryRecommendationsResponse } from "@repo/types";
import { useAuthorizationHeader } from "../authHeaders";

export const useCarbonInventorySubcategoryRecommendations = (
  carbonInventoryId: string
) => {
  const { headers } = useAuthorizationHeader(carbonInventoryId);

  return useQuery<GetCarbonInventorySubcategoryRecommendationsResponse>({
    queryKey: [
      ...carbonInventoryKeys.subcategoryRecommendations(carbonInventoryId),
      headers,
    ],
    queryFn: async () => {
      return apiClient
        .get(
          `carbon-inventories/${carbonInventoryId}/subcategory-recommendations`,
          { headers }
        )
        .json();
    },
    enabled: Boolean(carbonInventoryId),
    staleTime: Infinity,
  });
};
