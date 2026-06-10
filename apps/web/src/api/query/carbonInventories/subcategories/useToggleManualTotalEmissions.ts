import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "../keys";
import { useAuthorizationHeader } from "../authHeaders";

interface ToggleManualTotalEmissionsParams {
  activated: boolean;
}

export const useToggleManualTotalEmissions = (
  inventoryId: string,
  subcategoryId: string
) => {
  const queryClient = useQueryClient();
  const { headers } = useAuthorizationHeader(inventoryId);

  return useMutation<void, Error, ToggleManualTotalEmissionsParams>({
    // The endpoint responds 204 No Content; ky v2 .json() throws on empty bodies
    mutationFn: async ({ activated }) => {
      await apiClient.post(
        `carbon-inventories/${inventoryId}/subcategories/${subcategoryId}/manual-total-emissions`,
        { json: { activated }, headers }
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(inventoryId) &&
            query.queryKey.includes(
              CarbonInventoryQueryKey.EmissionsUpdateDependency
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(CarbonInventoryQueryKey.ListDependency),
        }),
      ]);
    },
  });
};
