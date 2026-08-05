import { useQuery } from "@tanstack/react-query";
import type { GetSubmissionWarningsResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { submissionsKeys } from "./keys";
import { STALE_TIME_MS } from "../../../config/constants";

/**
 * Lazily fetches the computed warnings for a submission (admin-only endpoint).
 * Enabled only when a submission id is provided, so it fires when the review
 * dialog opens for a concrete submission.
 */
export const useGetSubmissionWarnings = (submissionId: string | undefined) => {
  return useQuery<GetSubmissionWarningsResponse>({
    queryKey: submissionsKeys.warnings(submissionId ?? ""),
    queryFn: () =>
      apiClient
        .get(`admin/submissions/${submissionId}/warnings`)
        .json<GetSubmissionWarningsResponse>(),
    enabled: !!submissionId,
    staleTime: STALE_TIME_MS,
  });
};
