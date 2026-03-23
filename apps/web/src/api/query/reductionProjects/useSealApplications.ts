import { useQuery } from "@tanstack/react-query";
import type { GetAllSealApplicationsResponse } from "@repo/types";
import { reductionProjectKeys } from "./keys";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS, REFETCH_INTERVAL_MS } from "@/config/constants";

export const useSealApplications = (organizationId: string) =>
  useQuery<GetAllSealApplicationsResponse>({
    queryKey: [
      ...reductionProjectKeys.sealApplications,
      { organizationId },
    ],
    queryFn: () =>
      apiClient
        .get("reduction-projects/seal-applications", {
          searchParams: { organizationId },
        })
        .json(),
    staleTime: STALE_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    enabled: !!organizationId,
  });
