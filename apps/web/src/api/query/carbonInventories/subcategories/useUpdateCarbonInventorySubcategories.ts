import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http/client";
import { UpdateCarbonInventorySubcategoriesRequest } from "@repo/types";

export const useUpdateCarbonInventorySubcategories = (inventoryId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCarbonInventorySubcategoriesRequest) =>
      apiClient
        .patch(`carbon-inventories/${inventoryId}/subcategories`, {
          json: data,
        })
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
