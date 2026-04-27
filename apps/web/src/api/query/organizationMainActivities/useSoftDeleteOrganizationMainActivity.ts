import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteOrganizationMainActivityResponse } from "@repo/types";
import { organizationMainActivityKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteOrganizationMainActivityResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`admin/organization-main-activities/${id}`).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: organizationMainActivityKeys.admin.all,
      });
      void queryClient.invalidateQueries({
        queryKey: organizationMainActivityKeys.all,
      });
    },
  });
};
