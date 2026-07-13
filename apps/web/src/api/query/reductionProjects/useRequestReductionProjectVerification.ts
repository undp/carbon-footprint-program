import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RequestReductionProjectVerificationBody } from "@repo/types";
import { apiClient } from "@/api/http";
import { requestsKeys } from "../requests/keys";
import { SubmissionQueryKey } from "../submissions/keys";
import { ReductionProjectQueryKey } from "./keys";

interface RequestReductionProjectVerificationInput {
  id: string;
  body?: RequestReductionProjectVerificationBody;
}

export const useRequestReductionProjectVerification = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RequestReductionProjectVerificationInput>({
    mutationFn: async ({ id, body }) => {
      await apiClient.post(
        `reduction-projects/${id}/request-verification`,
        body ? { json: body } : undefined
      );
    },
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
            query.queryKey.includes(
              ReductionProjectQueryKey.AttributesUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(ReductionProjectQueryKey.ListDependency),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(SubmissionQueryKey.HistoryUpdateDependency),
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminAll,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminKpis,
          exact: true,
        }),
      ]);
    },
  });
};
