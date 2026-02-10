import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { carbonInventoryKeys } from "./keys";
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
          queryKey: carbonInventoryKeys.all,
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.detail(variables.id),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.mainActivityEquivalence(variables.id),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: carbonInventoryKeys.suggestedReductionPlan(variables.id),
          exact: true,
        }),
      ]);
    },
  });
};
