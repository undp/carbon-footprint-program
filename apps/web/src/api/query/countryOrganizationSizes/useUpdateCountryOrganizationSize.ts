import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateCountryOrganizationSizeRequest,
  UpdateCountryOrganizationSizeResponse,
} from "@repo/types";
import { CountryOrganizationSizeQueryKey } from "./keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useUpdateCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCountryOrganizationSizeResponse,
    Error,
    { id: string; body: UpdateCountryOrganizationSizeRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient
        .patch(`admin/country-organization-sizes/${id}`, { json: body })
        .json(),
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
