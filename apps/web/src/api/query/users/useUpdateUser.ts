import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/api/http";
import { UpdateUserBody, UpdateUserResponse } from "@repo/types";

interface UpdateUserVariables {
  id: string;
  data: UpdateUserBody;
}

export const useUpdateUser = () =>
  useMutation<UpdateUserResponse, Error, UpdateUserVariables>({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`users/${id}`, { json: data }).json(),
  });
