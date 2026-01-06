import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { carbonInventorySubcategoryKeys } from "./keys";

interface UpdateSubcategoryItem {
  subcategoryId: number;
  selected: boolean;
}

type UpdateSubcategoriesRequest = UpdateSubcategoryItem[];

export const useUpdateCarbonInventorySubcategories = (
  carbonInventoryId: string,
  _data: UpdateSubcategoriesRequest
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_data: UpdateSubcategoriesRequest) => {
      // Simulación de actualización
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });

      /* 
      // Implementación futura cuando el endpoint PATCH esté disponible:
      return apiClient
        .patch(`carbon-inventories/${carbonInventoryId}/subcategories`, {
          json: _data,
        })
        .json();
      */
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(carbonInventoryId),
      });
      void queryClient.invalidateQueries({
        queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
      });
    },
  });
};
