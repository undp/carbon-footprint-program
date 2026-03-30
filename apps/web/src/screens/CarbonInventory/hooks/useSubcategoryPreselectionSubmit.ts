import { useUpdateCarbonInventorySubcategories } from "@/api/query/carbonInventories/subcategories/useUpdateCarbonInventorySubcategories";
import { useCallback } from "react";
import { useSnackbar } from "notistack";

interface HookResult {
  saveSelections: (
    values: Record<string, boolean>,
    isDirty: boolean
  ) => Promise<void>;
  isSavingSelections: boolean;
}

export const useSubcategoryPreselectionSubmit = (
  inventoryId: string,
  { onSuccess }: { onSuccess?: () => void } = {}
): HookResult => {
  const { enqueueSnackbar } = useSnackbar();
  const { mutateAsync, isPending } = useUpdateCarbonInventorySubcategories();

  const saveSelections = useCallback(
    async (values: Record<string, boolean>, isDirty: boolean) => {
      if (!isDirty) {
        onSuccess?.();
        return;
      }

      try {
        const payload = Object.entries(values).map(([id, selected]) => ({
          id,
          selected,
        }));

        await mutateAsync({ id: inventoryId, data: payload });

        enqueueSnackbar("Subcategorías actualizadas exitosamente", {
          variant: "success",
        });

        onSuccess?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error al guardar las subcategorías:", error);
        enqueueSnackbar("Error al guardar las subcategorías", {
          variant: "error",
        });
      }
    },
    [mutateAsync, onSuccess, enqueueSnackbar, inventoryId]
  );

  return {
    saveSelections,
    isSavingSelections: isPending,
  };
};
