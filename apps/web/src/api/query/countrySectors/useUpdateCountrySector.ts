import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateCountrySectorRequest,
  UpdateCountrySectorResponse,
} from "@repo/types";
import { CountrySectorQueryKey } from "./keys";
import { apiClient } from "@/api/http";

export const useUpdateCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCountrySectorResponse,
    Error,
    { id: string; body: UpdateCountrySectorRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient.patch(`admin/country-sectors/${id}`, { json: body }).json(),
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
