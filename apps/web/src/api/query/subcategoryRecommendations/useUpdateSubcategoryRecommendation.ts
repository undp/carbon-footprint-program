import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateSubcategoryRecommendationRequest,
  UpdateSubcategoryRecommendationResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { subcategoryRecommendationKeys } from "./keys";

export const useUpdateSubcategoryRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateSubcategoryRecommendationResponse,
    Error,
    UpdateSubcategoryRecommendationRequest
  >({
    mutationFn: (body) =>
      apiClient
        .put("subcategory-recommendations", { json: body })
        .json<UpdateSubcategoryRecommendationResponse>(),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: subcategoryRecommendationKeys.list(variables.methodologyId),
      });
    },
  });
};
