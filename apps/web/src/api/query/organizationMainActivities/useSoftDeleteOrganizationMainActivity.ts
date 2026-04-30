import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OrganizationMainActivityQueryKey } from "./keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteOrganizationMainActivity = () => {
  const queryClient = useQueryClient();
  return useMutation<null, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`admin/organization-main-activities/${id}`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              OrganizationMainActivityQueryKey.CatalogUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminAll(),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: organizationKeys.adminKpis(),
          exact: true,
        }),
      ]);
    },
  });
};
