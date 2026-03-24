import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { DeleteCarbonInventoryResponse } from "@repo/types";

export const useDeleteCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteCarbonInventoryResponse, Error, string>({
    mutationFn: (id) => apiClient.delete(`carbon-inventories/${id}`).json(),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
            query.queryKey.includes(
              "carbonInventoryAttributesUpdateDependency"
            ),
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("carbonInventoriesListDependency"),
        }),
      ]);
    },
  });
};
