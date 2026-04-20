import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UnblockOrganizationResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { SubmissionQueryKey } from "../submissions/keys.js";

export const useUnblockOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation<UnblockOrganizationResponse, Error, string>({
    mutationFn: async (id) =>
      apiClient.post(`admin/organizations/${id}/unblock`).json(),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("organizationStatusDependency"),
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
