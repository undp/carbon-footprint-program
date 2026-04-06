import { useQuery } from "@tanstack/react-query";
import type { GetSubmissionHistoryResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { submissionsKeys } from "./key";
import { STALE_TIME_MS } from "../../../config/constants";

export const useGetOrganizationHistory = (
  organizationId: string | undefined
) => {
  return useQuery<GetSubmissionHistoryResponse>({
    queryKey: submissionsKeys.organizationHistory(organizationId ?? ""),
    queryFn: () =>
      apiClient
        .get(`submissions/organization/${organizationId}/history`)
        .json<GetSubmissionHistoryResponse>(),
    enabled: !!organizationId,
    staleTime: STALE_TIME_MS,
  });
};
