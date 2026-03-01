import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { RemoveOrganizationUserResponse } from "@repo/types";

interface RemoveOrganizationUserParams {
  organizationId: string;
  userId: string;
}

export const useRemoveOrganizationUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    RemoveOrganizationUserResponse,
    Error,
    RemoveOrganizationUserParams
  >({
    mutationFn: ({ organizationId, userId }) =>
      apiClient
        .delete(`app/organizations/${organizationId}/users/${userId}`)
        .json<RemoveOrganizationUserResponse>(),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [...organizationKeys.users, variables.organizationId],
      });
    },
  });
};
