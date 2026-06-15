import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { RequestReductionProjectVerificationBody } from "@repo/types";
import { ReductionProjectQueryKey } from "./keys";
import { SubmissionQueryKey } from "../submissions/keys.js";

interface RequestReductionProjectVerificationInput {
  id: string;
  body: RequestReductionProjectVerificationBody;
}

export const useRequestReductionProjectVerification = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, RequestReductionProjectVerificationInput>({
    // The endpoint returns an empty body — do NOT call `.json()`.
    mutationFn: async ({ id, body }) => {
      await apiClient.post(`reduction-projects/${id}/request-verification`, {
        json: body,
      });
    },
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        // Covers both the detail and access queries (both carry the id and the
        // attributes-update dependency key).
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
      ]);
    },
  });
};
