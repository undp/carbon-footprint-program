import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RejectRequestBody, RejectRequestResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "./keys.js";
import { organizationKeys } from "../organizations/keys.js";
import { SubmissionQueryKey } from "../submissions/keys.js";

export const useReviewSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RejectRequestResponse,
    Error,
    { id: string; body?: RejectRequestBody }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .post(`admin/requests/${id}/review`, { json: body ?? {} })
        .json<RejectRequestResponse>(),
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
      ]);
    },
  });
};
