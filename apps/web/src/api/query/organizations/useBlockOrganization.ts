import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BlockOrganizationResponse } from "@repo/types";
import { apiClient } from "@/api/http";
import { SubmissionQueryKey } from "../submissions/keys.js";

export const useBlockOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation<BlockOrganizationResponse, Error, string>({
    mutationFn: async (id) =>
      apiClient.post(`admin/organizations/${id}/block`).json(),
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
