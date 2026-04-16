import type { GetExplanationBySlugResponse } from "@repo/types";
import { explanationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

export const useExplanation = (slug: string | null) =>
  useQuery<GetExplanationBySlugResponse>({
    queryKey: explanationKeys.explanation(slug),
    queryFn: () => apiClient.get(`explanations/${slug}`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!slug,
  });
