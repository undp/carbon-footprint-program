import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { apiClient } from "@/api/http";

type UpdateCarbonInventoryVariables = {
  id: string;
  data: UpdateCarbonInventoryRequest;
};

export const useUpdateCarbonInventory = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateCarbonInventoryResponse,
    Error,
    UpdateCarbonInventoryVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient.patch(`carbon-inventories/${id}`, { json: data }).json(),
    onSuccess: async (_data, { id }) => {
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
