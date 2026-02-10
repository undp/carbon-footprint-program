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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.detail(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.emissionsSummaryCategories(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.subcategoriesRanking(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.sectorRanking(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.mainActivityEquivalence(inventoryId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.suggestedReductionPlan(inventoryId),
          exact: true,
        }),
      ]);
    },
  });
};
