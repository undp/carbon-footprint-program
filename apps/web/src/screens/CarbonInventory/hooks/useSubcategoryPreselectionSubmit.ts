import { useUpdateCarbonInventorySubcategories } from "@/api/query/carbonInventories/subcategories/useUpdateCarbonInventorySubcategories";
import { useCallback } from "react";
import { useSnackbar } from "notistack";

interface HookResult {
  submit: (values: Record<string, boolean>, isDirty: boolean) => Promise<void>;
  isSubmitting: boolean;
}

export const useSubcategoryPreselectionSubmit = (
  inventoryId: string,
  { onSuccess }: { onSuccess?: () => void } = {}
): HookResult => {
  const { enqueueSnackbar } = useSnackbar();
  const { mutateAsync, isPending } =
    useUpdateCarbonInventorySubcategories(inventoryId);

  const submit = useCallback(
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

        await mutateAsync(payload);

        enqueueSnackbar("Subcategorías guardadas exitosamente", {
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
    [mutateAsync, onSuccess, enqueueSnackbar]
  );

  return {
    submit,
    isSubmitting: isPending,
  };
};
