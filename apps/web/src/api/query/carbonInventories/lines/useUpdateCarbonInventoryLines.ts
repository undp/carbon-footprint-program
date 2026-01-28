import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateCarbonInventoryLinesRequest,
  UpdateCarbonInventoryLinesResponse,
} from "@repo/types";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http";

type UpdateCarbonInventoryLinesVariables = {
  id: string;
  data: UpdateCarbonInventoryLinesRequest;
};

export const useUpdateCarbonInventoryLines = (inventoryId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateCarbonInventoryLinesResponse,
    Error,
    UpdateCarbonInventoryLinesVariables
  >({
    mutationFn: ({ data }) =>
      apiClient
        .patch(`carbon-inventories/${inventoryId}/lines`, { json: data })
        .json(),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.all,
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(variables.id),
        exact: true,
      });
    },
  });
};
