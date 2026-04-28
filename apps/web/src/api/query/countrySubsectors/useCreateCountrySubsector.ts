import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCountrySubsectorRequest,
  CreateCountrySubsectorResponse,
} from "@repo/types";
import { CountrySubsectorQueryKey } from "./keys";
import { CountrySectorQueryKey } from "../countrySectors/keys";
import { apiClient } from "@/api/http";

export const useCreateCountrySubsector = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CreateCountrySubsectorResponse,
    Error,
    CreateCountrySubsectorRequest
  >({
    mutationFn: (body) =>
      apiClient.post("admin/country-subsectors", { json: body }).json(),
    onSuccess: async () => {
      // Sector list also refreshes because its impactedChildren counts shift.
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
