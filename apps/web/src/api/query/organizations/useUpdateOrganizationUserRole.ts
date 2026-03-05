import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import {
  UpdateOrganizationUserRoleBody,
  UpdateOrganizationUserRoleResponse,
} from "@repo/types";

interface UpdateOrganizationUserRoleParams {
  organizationId: string;
  userId: string;
  data: UpdateOrganizationUserRoleBody;
}

export const useUpdateOrganizationUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateOrganizationUserRoleResponse,
    Error,
    UpdateOrganizationUserRoleParams
  >({
    mutationFn: ({ organizationId, userId, data }) =>
      apiClient
        .patch(`app/organizations/${organizationId}/users/${userId}`, {
          json: data,
        })
        .json<UpdateOrganizationUserRoleResponse>(),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: organizationKeys.users(variables.organizationId),
      });
    },
  });
};
