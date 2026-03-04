import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationKeys } from "./keys";
import { apiClient } from "@/api/http";

export const useRequestOrganizationAccreditation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () =>
      apiClient.post(`app/organizations/${id}/request-accreditation`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: organizationKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.detail(id),
        }),
      ]);
    },
  });
};
