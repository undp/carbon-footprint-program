import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "./keys";
import { useAuthorizationHeader } from "./authHeaders";

export const useUpdateCarbonInventory = (inventoryId: string) => {
  const queryClient = useQueryClient();
  const { headers } = useAuthorizationHeader(inventoryId);

  return useMutation<
    UpdateCarbonInventoryResponse,
    Error,
    UpdateCarbonInventoryRequest
  >({
    mutationFn: (data) =>
      apiClient
        .patch(`carbon-inventories/${inventoryId}`, { json: data, headers })
        .json(),
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(inventoryId) &&
            query.queryKey.includes(
              CarbonInventoryQueryKey.AttributesUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
        }),
        // A payload carrying the year may have cleared the frozen catalogue
        // factors and their computed results, which is a change to the
        // emissions and not only to the attributes: the emissions summary, the
        // subcategory and sector rankings, the verifier's factor report and the
        // reduction plan all hang off this token and none of them off the
        // attributes one.
        ...(variables.year !== undefined
          ? [
              queryClient.invalidateQueries({
                predicate: (query) =>
                  query.queryKey.includes(inventoryId) &&
                  query.queryKey.includes(
                    CarbonInventoryQueryKey.EmissionsUpdateDependency
                  ),
              }),
            ]
          : []),
      ]);
    },
  });
};
