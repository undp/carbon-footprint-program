import { useMutation, useQueryClient } from "@tanstack/react-query";
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
          predicate: (query) =>
            query.queryKey.includes(inventoryId) &&
            query.queryKey.includes("carbonInventoryEmissionsUpdateDependency"),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("carbonInventoriesListDependency"),
        }),
      ]);
    },
  });
};
