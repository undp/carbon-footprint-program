import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateOrganizationMainActivityRequest,
  UpdateOrganizationMainActivityResponse,
} from "@repo/types";
import { organizationMainActivityKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useUpdateOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateOrganizationMainActivityResponse,
    Error,
    { id: string; body: UpdateOrganizationMainActivityRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .patch(`admin/organization-main-activities/${id}`, { json: body })
        .json(),
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
