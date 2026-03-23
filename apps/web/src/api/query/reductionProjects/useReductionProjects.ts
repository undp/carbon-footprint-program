import { useQuery } from "@tanstack/react-query";
import type { GetAllReductionProjectsResponse } from "@repo/types";
import { reductionProjectKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS, REFETCH_INTERVAL_MS } from "@/config/constants";

type Filters = {
  organizationId: string;
  branchId?: string;
  status?: string;
};

export const useReductionProjects = (filters: Filters) => {
  const searchParams: Record<string, string> = {
    organizationId: filters.organizationId,
  };
  if (filters.branchId) searchParams.branchId = filters.branchId;
  if (filters.status) searchParams.status = filters.status;

  return useQuery<GetAllReductionProjectsResponse>({
    queryKey: [...reductionProjectKeys.all, searchParams],
    queryFn: () =>
      apiClient.get("reduction-projects", { searchParams }).json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!filters.organizationId,
  });
};
