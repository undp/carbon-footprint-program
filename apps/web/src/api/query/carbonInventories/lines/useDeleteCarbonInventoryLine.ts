import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DeleteCarbonInventoryLineResponse } from "@repo/types";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http";

interface DeleteCarbonInventoryLineParams {
  lineId: string;
}

export const useDeleteCarbonInventoryLine = (
  inventoryId: string,
  subcategoryId: string
) => {
  const queryClient = useQueryClient();

  return useMutation<
    DeleteCarbonInventoryLineResponse,
    Error,
    DeleteCarbonInventoryLineParams
  >({
    mutationFn: ({ lineId }) =>
      apiClient
        .delete(
          `carbon-inventories/${inventoryId}/subcategories/${subcategoryId}/lines/${lineId}`
        )
        .json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(inventoryId),
      });
    },
  });
};
