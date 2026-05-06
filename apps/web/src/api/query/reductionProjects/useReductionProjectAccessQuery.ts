import { useQuery } from "@tanstack/react-query";
import type { GetReductionProjectAccessResponse } from "@repo/types";
import { reductionProjectKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useReductionProjectAccessQuery = (id: string | undefined) =>
  useQuery<GetReductionProjectAccessResponse>({
    queryKey: reductionProjectKeys.access(id ?? ""),
    queryFn: () => apiClient.get(`reduction-projects/${id}/access`).json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!id,
  });
