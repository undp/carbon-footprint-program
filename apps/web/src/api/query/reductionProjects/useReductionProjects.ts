import { useQuery } from "@tanstack/react-query";
import type { GetAllReductionProjectsResponse } from "@repo/types";
import { reductionProjectKeys } from "./keys";
import { apiClient } from "@/api/http";
import { REFETCH_INTERVAL_MS, STALE_TIME_MS } from "@/config/constants";

export const useReductionProjects = (
  year?: string,
  organizationId?: string
) => {
  const normalizedYear = year && year !== "all" ? year : undefined;
  const normalizedOrganizationId =
    organizationId && organizationId !== "all" ? organizationId : undefined;

  return useQuery<GetAllReductionProjectsResponse>({
    queryKey: [
      ...reductionProjectKeys.all,
      normalizedYear,
      normalizedOrganizationId,
    ],
    queryFn: () =>
      apiClient
        .get("reduction-projects", {
          searchParams: {
            ...(normalizedYear && { year: normalizedYear }),
            ...(normalizedOrganizationId && {
              organizationId: normalizedOrganizationId,
            }),
          },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
};
