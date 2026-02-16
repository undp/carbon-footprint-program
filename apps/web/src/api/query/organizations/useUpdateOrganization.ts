import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";
import { CreateOrganizationBody } from "./useCreateOrganization";

//TODO: REPLACE WITH API TYPES
interface UpdateOrganizationParams {
  id: string;
  data: CreateOrganizationBody;
}

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, UpdateOrganizationParams>({
    mutationFn: ({ id, data }) =>
      apiClient.put(`organization/${id}`, { json: data }).json(),
    onSuccess: (_, { id }) =>
      // Invalidate and refetch carbon inventories list
      void queryClient.invalidateQueries({
        queryKey: [organizationKeys.all, organizationKeys.detail(id)],
        exact: true,
      }),
  });
};
