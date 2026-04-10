import { useQuery } from "@tanstack/react-query";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { reductionProjectKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useReductionProject = (id: string | undefined) =>
  useQuery<GetReductionProjectByIdResponse>({
    queryKey: reductionProjectKeys.detail(id ?? ""),
    queryFn: () => apiClient.get(`reduction-projects/${id}`).json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
