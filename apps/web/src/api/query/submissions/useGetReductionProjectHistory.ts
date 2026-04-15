import { useQuery } from "@tanstack/react-query";
import type { GetSubmissionHistoryResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { submissionsKeys } from "./keys";
import { STALE_TIME_MS } from "../../../config/constants";

export const useGetReductionProjectHistory = (
  reductionProjectId: string | undefined
) => {
  return useQuery<GetSubmissionHistoryResponse>({
    queryKey: submissionsKeys.reductionProjectHistory(reductionProjectId ?? ""),
    queryFn: () =>
      apiClient
        .get(`submissions/reduction-project/${reductionProjectId}/history`)
        .json<GetSubmissionHistoryResponse>(),
    enabled: !!reductionProjectId,
    staleTime: STALE_TIME_MS,
  });
};
