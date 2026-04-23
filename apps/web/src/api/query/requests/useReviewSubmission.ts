import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReviewSubmissionBody, ReviewSubmissionResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "./keys.js";
import { organizationKeys } from "../organizations/keys.js";
import { SubmissionQueryKey } from "../submissions/keys.js";
import { CarbonInventoryQueryKey } from "../carbonInventories/keys.js";

export const useReviewSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReviewSubmissionResponse,
    Error,
    { id: string; body: ReviewSubmissionBody }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .post(`admin/requests/${id}/review`, { json: body })
        .json<ReviewSubmissionResponse>(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminAll,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminKpis,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminAll(),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminKpis(),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.all,
          exact: true,
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(SubmissionQueryKey.HistoryUpdateDependency),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CarbonInventoryQueryKey.StatusUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              SubmissionQueryKey.SubmissionUpdateDependency
            ),
        }),
      ]);
    },
  });
};
