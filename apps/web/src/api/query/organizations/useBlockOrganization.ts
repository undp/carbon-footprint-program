import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BlockOrganizationResponse } from "@repo/types";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { carbonInventoryKeys } from "../carbonInventories/keys";

export const useBlockOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation<BlockOrganizationResponse, Error, string>({
    mutationFn: async (id) =>
      apiClient.post(`admin/organizations/${id}/block`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminKpis(),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.all,
          exact: true,
        }),
      ]);
    },
  });
};
