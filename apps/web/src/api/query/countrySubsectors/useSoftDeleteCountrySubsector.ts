import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCountrySubsectorResponse } from "@repo/types";
import { CountrySubsectorQueryKey } from "./keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { OrganizationMainActivityQueryKey } from "../organizationMainActivities/keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCountrySubsectorResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`admin/country-subsectors/${id}`).json(),
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
