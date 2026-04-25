import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ListSubcategoryRecommendationsResponse,
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
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData<ListSubcategoryRecommendationsResponse>(
        subcategoryRecommendationKeys.list(),
        (old) => {
          if (!old) return old;
          if (updatedGroup.subcategoryIds.length === 0) {
            return old.filter(
              (g) =>
                !(
                  g.sectorId === updatedGroup.sectorId &&
                  g.subsectorId === updatedGroup.subsectorId
                )
            );
          }
          const idx = old.findIndex(
            (g) =>
              g.sectorId === updatedGroup.sectorId &&
              g.subsectorId === updatedGroup.subsectorId
          );
          return idx === -1
            ? [...old, updatedGroup]
            : old.map((g, i) => (i === idx ? updatedGroup : g));
        }
      );
      void queryClient.invalidateQueries({
        queryKey: subcategoryRecommendationKeys.list(),
      });
    },
  });
};
