import { useQuery } from "@tanstack/react-query";
import type { GetReductionProjectsMinimalResponse } from "@repo/types";
import { reductionProjectKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useReductionProjectsMinimal = () =>
  useQuery<GetReductionProjectsMinimalResponse>({
    queryKey: reductionProjectKeys.minimal,
    queryFn: () => apiClient.get("reduction-projects/minimal").json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
