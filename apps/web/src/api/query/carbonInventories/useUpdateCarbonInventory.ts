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

export function useUpdateCarbonInventory() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateCarbonInventoryResponse,
    Error,
    UpdateCarbonInventoryVariables
  >({
    mutationFn: ({ id, data }) =>
      apiClient.put(`carbon-inventories/${id}`, { json: data }).json(),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(variables.id),
      });
    },
  });
}

