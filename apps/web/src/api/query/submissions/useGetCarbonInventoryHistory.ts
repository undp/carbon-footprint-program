import { useQuery } from "@tanstack/react-query";
import type { GetSubmissionHistoryResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { submissionsKeys } from "./keys";
import { STALE_TIME_MS } from "../../../config/constants";

export const useGetCarbonInventoryHistory = (
  carbonInventoryId: string | undefined
) => {
  return useQuery<GetSubmissionHistoryResponse>({
    queryKey: submissionsKeys.carbonInventoryHistory(carbonInventoryId ?? ""),
    queryFn: () =>
      apiClient
        .get(`submissions/carbon-inventory/${carbonInventoryId}/history`)
        .json<GetSubmissionHistoryResponse>(),
    enabled: !!carbonInventoryId,
    staleTime: STALE_TIME_MS,
  });
};
