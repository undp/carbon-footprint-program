import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RequestReductionProjectVerificationBody } from "@repo/types";
import { apiClient } from "@/api/http";
import { ReductionProjectQueryKey } from "./keys";
import { requestsKeys } from "@/api/query/requests/keys";

interface RequestVerificationInput {
  id: string;
  body?: RequestReductionProjectVerificationBody;
}

export const useRequestReductionProjectVerification = () => {
  const queryClient = useQueryClient();

  return useMutation<null, Error, RequestVerificationInput>({
    mutationFn: ({ id, body }) =>
      apiClient
        .post(
          `reduction-projects/${id}/request-verification`,
          body ? { json: body } : undefined
        )
        .json(),
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
