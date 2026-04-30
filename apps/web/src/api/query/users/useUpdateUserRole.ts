import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import type { SystemRole, UpdateUserRoleResponse } from "@repo/types";
import { userKeys } from "./keys";

interface UpdateUserRoleVariables {
  id: string;
  role: SystemRole;
}

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation<UpdateUserRoleResponse, Error, UpdateUserRoleVariables>({
    mutationFn: ({ id, role }) =>
      apiClient
        .patch(`users/${id}/role`, {
          json: { role },
        })
        .json(),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.users });
      void queryClient.invalidateQueries({
        queryKey: userKeys.roleHistory(id),
      });
    },
  });
};
