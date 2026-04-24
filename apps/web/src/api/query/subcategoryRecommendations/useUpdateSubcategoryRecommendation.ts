import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateSubcategoryRecommendationBody,
  UpdateSubcategoryRecommendationResponse,
} from "@repo/types";
import { subcategoryRecommendationKeys } from "./keys";
import { apiClient } from "@/api/http";

interface UpdateSubcategoryRecommendationVariables {
  sectorId: number;
  subsectorId: number | null;
  data: UpdateSubcategoryRecommendationBody;
}

export const useUpdateSubcategoryRecommendation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateSubcategoryRecommendationResponse,
    Error,
    UpdateSubcategoryRecommendationVariables
  >({
    mutationFn: ({ sectorId, subsectorId, data }) => {
      const searchParams: Record<string, string> = {
        sectorId: String(sectorId),
      };
      if (subsectorId !== null) {
        searchParams.subsectorId = String(subsectorId);
      }
      return apiClient
        .put("subcategory-recommendations", { json: data, searchParams })
        .json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: subcategoryRecommendationKeys.list(),
      });
    },
  });
};
