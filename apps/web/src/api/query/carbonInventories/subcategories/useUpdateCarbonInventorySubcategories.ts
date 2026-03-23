import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http/client";
import { UpdateCarbonInventorySubcategoriesRequest } from "@repo/types";
import { useAuth } from "@/contexts/AuthContext";
import { CarbonInventoryQueryKey } from "../keys";
import { getInventoryUuid } from "../inventoryUuid";

type UpdateCarbonInventorySubcategoriesVariables = {
  id: string;
  data: UpdateCarbonInventorySubcategoriesRequest;
};

export const useUpdateCarbonInventorySubcategories = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: UpdateCarbonInventorySubcategoriesVariables) => {
      const headers: Record<string, string> = {};
      if (!isAuthenticated) {
        const uuid = getInventoryUuid(id);
        if (uuid) {
          headers["x-carbon-inventory-uuid"] = uuid;
        }
      }
      return apiClient
        .patch(`carbon-inventories/${id}/subcategories`, {
          json: data,
          headers,
        })
        .json();
    },
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes(id) &&
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
