import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSubcategoryRecommendationBody,
  CreateSubcategoryRecommendationResponse,
  ListSubcategoryRecommendationsResponse,
} from "@repo/types";
import { subcategoryRecommendationKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateSubcategoryRecommendation = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateSubcategoryRecommendationResponse,
    Error,
    CreateSubcategoryRecommendationBody
  >({
    mutationFn: (data) =>
      apiClient.post("subcategory-recommendations", { json: data }).json(),
    onSuccess: (newGroup) => {
      queryClient.setQueryData<ListSubcategoryRecommendationsResponse>(
        subcategoryRecommendationKeys.list(),
        (old) => (old ? [...old, newGroup] : [newGroup])
      );
      void queryClient.invalidateQueries({
        queryKey: subcategoryRecommendationKeys.list(),
      });
    },
  });
};
