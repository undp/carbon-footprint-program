import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/http/client";
import { UpdateCarbonInventorySubcategoriesRequest } from "@repo/types";
import { CarbonInventoryQueryKey } from "../keys";

type UpdateCarbonInventorySubcategoriesVariables = {
  id: string;
  data: UpdateCarbonInventorySubcategoriesRequest;
};

export const useUpdateCarbonInventorySubcategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateCarbonInventorySubcategoriesVariables) =>
      apiClient
        .patch(`carbon-inventories/${id}/subcategories`, {
          json: data,
        })
        .json(),
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
