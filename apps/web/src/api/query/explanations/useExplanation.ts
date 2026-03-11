import type { GetExplanationByIdResponse } from "@repo/types";
import { explanationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { useQuery } from "@tanstack/react-query";

export const useExplanation = (id: string | null) =>
  useQuery<GetExplanationByIdResponse>({
    queryKey: explanationKeys.explanation(id),
    queryFn: () => apiClient.get(`explanations/${id}`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!id,
  });
