import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateSubcategoryRecommendationRequest,
  UpdateSubcategoryRecommendationResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { MaintainerQueryKey } from "../maintainer/keys";

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(
            MaintainerQueryKey.SubcategoryRecommendationsUpdateDependency
          ),
      });
    },
  });
};
