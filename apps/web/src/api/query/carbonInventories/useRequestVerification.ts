import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http/client";
import { requestsKeys } from "../requests/keys";
import { RequestVerificationBody } from "@repo/types";
import { CarbonInventoryQueryKey } from "./keys";
import { SubmissionQueryKey } from "../submissions/keys.js";

interface RequestVerificationInput {
  id: string;
  body?: RequestVerificationBody;
}

export const useRequestVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: RequestVerificationInput) =>
      apiClient
        .post(
          `carbon-inventories/${id}/request-verification`,
          body ? { json: body } : undefined
        )
        .json(),
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
            query.queryKey.includes(
              CarbonInventoryQueryKey.AttributesUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminAll,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: requestsKeys.adminKpis,
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
      ]);
    },
  });
};
