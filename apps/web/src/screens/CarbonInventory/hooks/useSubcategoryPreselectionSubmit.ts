import { useUpdateCarbonInventorySubcategories } from "@/api/query/carbonInventories/subcategories/useUpdateCarbonInventorySubcategories";
import { useCallback } from "react";

export const useSubcategoryPreselectionSubmit = (
  inventoryId: string,
  { onSuccess }: { onSuccess?: () => void } = {}
): {
  submit: (values: Record<string, boolean>) => Promise<void>;
  isSubmitting: boolean;
} => {
  const { mutateAsync, isPending } =
    useUpdateCarbonInventorySubcategories(inventoryId);

  const submit = useCallback(
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
    submit,
    isSubmitting: isPending,
  };
};
