import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CountrySubsectorQueryKey } from "./keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { OrganizationMainActivityQueryKey } from "../organizationMainActivities/keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`admin/country-subsectors/${id}`);
    },
    onSuccess: async () => {
      // Cascade soft-delete also affects main activities; sector list refreshes
      // because its impactedChildren counts shift.
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountrySubsectorQueryKey.CatalogUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountrySectorQueryKey.CatalogUpdateDependency
            ),
        }),
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
