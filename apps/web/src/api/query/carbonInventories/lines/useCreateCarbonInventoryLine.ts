import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateCarbonInventoryLineResponse } from "@repo/types";
import { carbonInventoryKeys } from "../keys";
import { apiClient } from "@/api/http";

export const useCreateCarbonInventoryLine = (
  inventoryId: string,
  subcategoryId: string
) => {
  const queryClient = useQueryClient();

  return useMutation<CreateCarbonInventoryLineResponse, Error, void>({
    mutationFn: () =>
      apiClient
        .post(
          `carbon-inventories/${inventoryId}/subcategories/${subcategoryId}/lines`
        )
        .json(),
    onSuccess: () => {
      // Invalidate the inventory detail to keep server and client in sync
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(inventoryId),
        exact: true,
      });
    },
  });
};
