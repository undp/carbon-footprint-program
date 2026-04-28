import { useQuery } from "@tanstack/react-query";
import type { GetAllSubcategoryRecommendationsResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { subcategoryRecommendationKeys } from "./keys";

export const useSubcategoryRecommendations = (
  methodologyId: string | undefined
) =>
  useQuery<GetAllSubcategoryRecommendationsResponse>({
    queryKey: subcategoryRecommendationKeys.list(methodologyId),
    queryFn: () =>
      apiClient
        .get("subcategory-recommendations", {
          searchParams: { methodologyId: methodologyId ?? "" },
        })
        .json<GetAllSubcategoryRecommendationsResponse>(),
    enabled: !!methodologyId,
    staleTime: STALE_TIME_MS,
  });
