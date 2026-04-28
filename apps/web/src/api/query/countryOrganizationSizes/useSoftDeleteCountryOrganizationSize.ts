import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteCountryOrganizationSizeResponse } from "@repo/types";
import { CountryOrganizationSizeQueryKey } from "./keys";
import { apiClient } from "@/api/http";

export const useSoftDeleteCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<DeleteCountryOrganizationSizeResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.delete(`admin/country-organization-sizes/${id}`).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountryOrganizationSizeQueryKey.CatalogUpdateDependency
            ),
        }),
      ]);
    },
  });
};
