import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreCountryOrganizationSizeResponse } from "@repo/types";
import { CountryOrganizationSizeQueryKey } from "./keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useRestoreCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreCountryOrganizationSizeResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/country-organization-sizes/${id}/restore`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountryOrganizationSizeQueryKey.CatalogUpdateDependency
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
