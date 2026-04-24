import { useQuery } from "@tanstack/react-query";
import type { ListSubcategoryRecommendationsResponse } from "@repo/types";
import { subcategoryRecommendationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";

export const useSubcategoryRecommendations = () =>
  useQuery<ListSubcategoryRecommendationsResponse>({
    queryKey: subcategoryRecommendationKeys.list(),
    queryFn: () => apiClient.get("subcategory-recommendations").json(),
    staleTime: STALE_TIME_MS,
  });
