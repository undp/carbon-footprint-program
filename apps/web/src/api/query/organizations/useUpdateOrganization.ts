import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import {
  UpdateOrganizationBody,
  UpdateOrganizationResponse,
} from "@repo/types";

export const useUpdateOrganization = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<UpdateOrganizationResponse, Error, UpdateOrganizationBody>(
    {
      mutationFn: (data) =>
        apiClient.patch(`app/organizations/${id}`, { json: data }).json(),
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: organizationKeys.all,
            exact: true,
          }),
          queryClient.invalidateQueries({
            queryKey: organizationKeys.detail(id ?? ""),
            exact: true,
          }),
        ]);
      },
    }
  );
};
