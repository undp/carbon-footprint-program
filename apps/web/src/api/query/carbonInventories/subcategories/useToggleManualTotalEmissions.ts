import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http";

interface ToggleManualTotalEmissionsParams {
  activated: boolean;
}

export const useToggleManualTotalEmissions = (
  inventoryId: string,
  subcategoryId: string
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleManualTotalEmissionsParams>({
    mutationFn: ({ activated }) =>
      apiClient
        .post(
          `carbon-inventories/${inventoryId}/subcategories/${subcategoryId}/manual-total-emissions`,
          { json: { activated } }
        )
        .json(),
    onSuccess: () => {
      // Return the promise so that the mutation caller can await the invalidation
      return queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(inventoryId),
      });
    },
  });
};
