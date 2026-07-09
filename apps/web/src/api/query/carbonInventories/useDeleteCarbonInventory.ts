import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http";
import { CarbonInventoryQueryKey } from "./keys";

export const useDeleteCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`carbon-inventories/${id}`);
    },
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
            query.queryKey.includes(
              CarbonInventoryQueryKey.AttributesUpdateDependency
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
