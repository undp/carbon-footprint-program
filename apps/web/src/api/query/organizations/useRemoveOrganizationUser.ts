import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import {
  RemoveOrganizationUserResponse,
  RemoveOrganizationUserParams,
} from "@repo/types";

export const useRemoveOrganizationUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RemoveOrganizationUserResponse,
    Error,
    RemoveOrganizationUserParams
  >({
    mutationFn: ({ organizationId, organizationUserId }) =>
      apiClient
        .delete(
          `app/organizations/${organizationId}/users/${organizationUserId}`
        )
        .json<RemoveOrganizationUserResponse>(),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [...organizationKeys.users, variables.organizationId],
      });
    },
  });
};
