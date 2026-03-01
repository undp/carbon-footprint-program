import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import {
  AddOrganizationUserBody,
  AddOrganizationUserResponse,
} from "@repo/types";

interface AddOrganizationUserParams {
  organizationId: string;
  data: AddOrganizationUserBody;
}

export const useAddOrganizationUser = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AddOrganizationUserResponse,
    Error,
    AddOrganizationUserParams
  >({
    mutationFn: ({ organizationId, data }) =>
      apiClient
        .post(`app/organizations/${organizationId}/users`, { json: data })
        .json<AddOrganizationUserResponse>(),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: [...organizationKeys.users, variables.organizationId],
      });
    },
  });
};
