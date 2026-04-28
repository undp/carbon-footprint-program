import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RestoreCountrySectorResponse } from "@repo/types";
import { CountrySectorQueryKey } from "./keys";
import { apiClient } from "@/api/http";

export const useRestoreCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<RestoreCountrySectorResponse, Error, string>({
    mutationFn: (id) =>
      apiClient.post(`admin/country-sectors/${id}/restore`).json(),
    onSuccess: async () => {
      await Promise.all([
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
