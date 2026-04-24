import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateSubcategoryRecommendationQuery,
  UpdateSubcategoryRecommendationRequest,
  UpdateSubcategoryRecommendationResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { subcategoryRecommendationKeys } from "./keys";

export type UpdateSubcategoryRecommendationVariables = {
  query: UpdateSubcategoryRecommendationQuery;
  body: UpdateSubcategoryRecommendationRequest;
};

const buildSearchParams = ({
  sectorId,
  subsectorId,
}: UpdateSubcategoryRecommendationQuery): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("sectorId", String(sectorId));
  if (subsectorId !== null) {
    params.set("subsectorId", String(subsectorId));
  }
  return params;
};

export const useUpdateSubcategoryRecommendation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateSubcategoryRecommendationResponse,
    Error,
    UpdateSubcategoryRecommendationVariables
  >({
    mutationFn: ({ query, body }) =>
      apiClient
        .put("subcategory-recommendations", {
          json: body,
          searchParams: buildSearchParams(query),
        })
        .json<UpdateSubcategoryRecommendationResponse>(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: subcategoryRecommendationKeys.list(),
      });
    },
  });
};
