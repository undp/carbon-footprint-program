import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCountrySectorResponse } from "@repo/types";
import { CountrySectorQueryKey } from "./keys";
import { CountrySubsectorQueryKey } from "../countrySubsectors/keys";
import { OrganizationMainActivityQueryKey } from "../organizationMainActivities/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCountrySectorResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`admin/country-sectors/${id}`).json(),
    onSuccess: async () => {
      // Cascade soft-delete also affects subsectors and main activities.
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountrySectorQueryKey.CatalogUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountrySubsectorQueryKey.CatalogUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              OrganizationMainActivityQueryKey.CatalogUpdateDependency
            ),
        }),
      ]);
    },
  });
};
