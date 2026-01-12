import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateCarbonInventoryLineResponse } from "@repo/types";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http";

interface CreateCarbonInventoryLineParams {
  inventoryId: string;
  subcategoryId: string;
}

export const useCreateCarbonInventoryLine = () => {
  const queryClient = useQueryClient();

  return useMutation<
    CreateCarbonInventoryLineResponse,
    Error,
    CreateCarbonInventoryLineParams
  >({
    mutationFn: ({ inventoryId, subcategoryId }) =>
      apiClient
        .post(
          `carbon-inventories/${inventoryId}/subcategories/${subcategoryId}/lines`
        )
        .json(),
    onSuccess: (_, { inventoryId }) => {
      // Invalidate the inventory detail to keep server and client in sync
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(inventoryId),
      });
    },
  });
};
