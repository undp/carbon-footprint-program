import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCountrySectorRequest,
  CreateCountrySectorResponse,
} from "@repo/types";
import { CountrySectorQueryKey } from "./keys";
import { organizationKeys } from "../organizations/keys";
import { apiClient } from "@/api/http";

export const useCreateCountrySector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCountrySectorResponse,
    Error,
    CreateCountrySectorRequest
  >({
    mutationFn: (body) =>
      apiClient.post("admin/country-sectors", { json: body }).json(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(
              CountrySectorQueryKey.CatalogUpdateDependency
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
