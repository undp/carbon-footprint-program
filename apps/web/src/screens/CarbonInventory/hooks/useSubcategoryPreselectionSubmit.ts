import { useUpdateCarbonInventorySubcategories } from "@/api/query/carbonInventories/subcategories/useUpdateCarbonInventorySubcategories";
import { useCallback } from "react";

export interface SubcategoryPreselectionSubmit {
  onSubmit: (values: Record<string, boolean>) => Promise<void>;
  isSubmitting: boolean;
}

export const useSubcategoryPreselectionSubmit = (
  inventoryId: string,
  { onSuccess }: { onSuccess?: () => void } = {}
): SubcategoryPreselectionSubmit => {
  const { mutateAsync, isPending } =
    useUpdateCarbonInventorySubcategories(inventoryId);

  const onSubmit = useCallback(
    async (values: Record<string, boolean>) => {
      const payload = Object.entries(values).map(([id, selected]) => ({
        subcategoryId: Number(id),
        selected,
      }));

      await mutateAsync(payload);
      onSuccess?.();
    },
    [mutateAsync, onSuccess]
  );

  return {
    onSubmit,
    isSubmitting: isPending,
  };
};
