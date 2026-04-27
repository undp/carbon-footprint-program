import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import type { UpdateUserResponse } from "@repo/types";
import { userKeys } from "./keys";

interface UpdateUserRoleVariables {
  id: string;
  role: string;
}

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation<UpdateUserResponse, Error, UpdateUserRoleVariables>({
    mutationFn: ({ id, role }) =>
      apiClient.patch(`users/${id}`, { json: { role } }).json(),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.users });
      void queryClient.invalidateQueries({
        queryKey: userKeys.roleHistory(id),
      });
    },
  });
};
