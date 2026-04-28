import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreCountrySubsectorResponse } from "@repo/types";
import { CountrySubsectorQueryKey } from "./keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useRestoreCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreCountrySubsectorResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/country-subsectors/${id}/restore`).json(),
    onSuccess: async () => {
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
      ]);
    },
  });
};
