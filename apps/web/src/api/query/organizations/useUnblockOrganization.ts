import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UnblockOrganizationResponse } from "@repo/types";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useUnblockOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation<UnblockOrganizationResponse, Error, string>({
    mutationFn: async (id) =>
      apiClient.post(`admin/organizations/${id}/unblock`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationKeys.adminAll }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminKpis,
        }),
      ]);
    },
  });
};
