import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import {
  CreateOrganizationBody,
  CreateOrganizationResponse,
} from "@repo/types";

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateOrganizationResponse, Error, CreateOrganizationBody>(
    {
      mutationFn: (data) =>
        apiClient.post("app/organizations", { json: data }).json(),
      onSuccess: async (response) =>
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: organizationKeys.all,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: organizationKeys.detail(response.id),
            exact: true,
          }),
        ]),
    }
  );
};
