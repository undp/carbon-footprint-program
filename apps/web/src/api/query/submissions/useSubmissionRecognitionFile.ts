import { useQuery } from "@tanstack/react-query";
import { GetSubmissionRecognitionFileResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { STALE_TIME_MS } from "@/config/constants";
import { submissionsKeys } from "./keys";
import { AppHttpError } from "@/api/http/errors";

export const useSubmissionRecognitionFile = (
  submissionId: string | undefined
) =>
  useQuery<GetSubmissionRecognitionFileResponse, AppHttpError>({
    queryKey: submissionsKeys.recognitionFile(submissionId ?? ""),
    queryFn: async () =>
      apiClient.get(`submissions/${submissionId}/recognition-file`).json(),
    staleTime: STALE_TIME_MS,
    enabled: !!submissionId,
    retry: false,
  });
