import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreOrganizationMainActivityResponse } from "@repo/types";
import { organizationMainActivityKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useRestoreOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreOrganizationMainActivityResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/organization-main-activities/${id}/restore`).json(),
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
