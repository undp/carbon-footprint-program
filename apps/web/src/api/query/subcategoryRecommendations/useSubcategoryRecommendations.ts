import { useQuery } from "@tanstack/react-query";
import type { GetAllSubcategoryRecommendationsResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { subcategoryRecommendationKeys } from "./keys";

export const useSubcategoryRecommendations = () =>
  useQuery<GetAllSubcategoryRecommendationsResponse>({
    queryKey: subcategoryRecommendationKeys.list(),
    queryFn: () =>
      apiClient
        .get("subcategory-recommendations")
        .json<GetAllSubcategoryRecommendationsResponse>(),
    staleTime: STALE_TIME_MS,
  });
