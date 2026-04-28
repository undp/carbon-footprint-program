import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateCountrySubsectorRequest,
  UpdateCountrySubsectorResponse,
} from "@repo/types";
import { CountrySubsectorQueryKey } from "./keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useUpdateCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateCountrySubsectorResponse,
    Error,
    { id: string; body: UpdateCountrySubsectorRequest }
  >({
    mutationFn: ({ id, body }) =>
      apiClient.patch(`admin/country-subsectors/${id}`, { json: body }).json(),
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
