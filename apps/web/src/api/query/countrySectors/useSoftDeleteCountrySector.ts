import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CountrySectorQueryKey } from "./keys";
import { CountrySubsectorQueryKey } from "../countrySubsectors/keys";
import { OrganizationMainActivityQueryKey } from "../organizationMainActivities/keys";
import { organizationKeys } from "../organizations/keys";
import { subcategoryRecommendationKeys } from "../subcategoryRecommendations/keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`admin/country-sectors/${id}`);
    },
    onSuccess: async () => {
      // Cascade soft-delete also affects subsectors, main activities and
      // subcategory recommendations.
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
        queryClient.invalidateQueries({
          queryKey: subcategoryRecommendationKeys.all,
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
