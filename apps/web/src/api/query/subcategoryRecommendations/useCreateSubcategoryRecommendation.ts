import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSubcategoryRecommendationRequest,
  CreateSubcategoryRecommendationResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { MaintainerQueryKey } from "../maintainer/keys";

export const useCreateSubcategoryRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateSubcategoryRecommendationResponse,
    Error,
    CreateSubcategoryRecommendationRequest
  >({
    mutationFn: (body) =>
      apiClient
        .post("subcategory-recommendations", { json: body })
        .json<CreateSubcategoryRecommendationResponse>(),
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
