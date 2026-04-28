import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCountryOrganizationSizeRequest,
  CreateCountryOrganizationSizeResponse,
} from "@repo/types";
import { CountryOrganizationSizeQueryKey } from "./keys";
import { apiClient } from "@/api/http";

export const useCreateCountryOrganizationSize = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCountryOrganizationSizeResponse,
    Error,
    CreateCountryOrganizationSizeRequest
  >({
    mutationFn: (body) =>
      apiClient.post("admin/country-organization-sizes", { json: body }).json(),
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
