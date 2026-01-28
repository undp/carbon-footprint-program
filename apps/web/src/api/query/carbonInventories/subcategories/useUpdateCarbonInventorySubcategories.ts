import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { carbonInventorySubcategoryKeys } from "./keys";
import { apiClient } from "@/api/http/client";
import { UpdateCarbonInventorySubcategoriesRequest } from "@repo/types";

export const useUpdateCarbonInventorySubcategories = (
  carbonInventoryId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCarbonInventorySubcategoriesRequest) =>
      apiClient
        .patch(`carbon-inventories/${carbonInventoryId}/subcategories`, {
          json: data,
        })
        .json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(carbonInventoryId),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
        exact: true,
      });
    },
  });
};
