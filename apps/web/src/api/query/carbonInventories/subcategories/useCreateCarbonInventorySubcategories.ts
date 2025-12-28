import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carbonInventoryKeys } from "../keys";
import { carbonInventorySubcategoryKeys } from "./keys";

interface CreateSubcategoriesRequest {
  subcategoryIds: number[];
}

export const useCreateCarbonInventorySubcategories = (
  carbonInventoryId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_data: CreateSubcategoriesRequest) => {
      // Por ahora simulamos la respuesta ya que el endpoint no existe en la API todavía
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 500);
      });

      /* 
      // Implementación futura cuando el endpoint esté disponible:
      return apiClient
        .post(`carbon-inventories/${carbonInventoryId}/subcategories`, {
          json: _data,
        })
        .json();
      */
    },
    onSuccess: () => {
      // Invalidar las queries relacionadas con el detalle del inventario
      void queryClient.invalidateQueries({
        queryKey: carbonInventoryKeys.detail(carbonInventoryId),
      });
      void queryClient.invalidateQueries({
        queryKey: carbonInventorySubcategoryKeys.list(carbonInventoryId),
      });
    },
  });
};
