import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { carbonInventoryKeys, invalidateCarbonInventoryMetadata } from "./keys";
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
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.includes("carbonInventoryUpdationDependency"),
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.detail(variables.id),
          exact: true,
        }),
        invalidateCarbonInventoryMetadata(queryClient, variables.id),
      ]);
    },
  });
};
