import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useUpdateCarbonInventoryLines } from "@/api/query";
import { EmissionCaptureFormValues } from "../types/EmissionCaptureTypes";
import { mapLinesToRequest } from "../utils/emissionCaptureTransformers";

interface Params {
  inventoryId: string;
  onSuccess?: () => void;
}

interface HookResult {
  submit: (data: EmissionCaptureFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export const useEmissionCaptureSubmit = ({
  inventoryId,
  onSuccess,
}: Params): HookResult => {
  const { enqueueSnackbar } = useSnackbar();
  const updateCarbonInventoryLinesMutation =
    useUpdateCarbonInventoryLines(inventoryId);

  const submit = useCallback(
    async (data: EmissionCaptureFormValues) => {
      try {
        if (!inventoryId) {
          enqueueSnackbar(
            "No se encontró el inventario organizacional a editar",
            {
              variant: "error",
            }
          );
          return;
        }

        // Get all lines from all subcategories as a flat array
        const allSubcategories = Object.values(data.subcategories || {});
        const flatLines = allSubcategories.flatMap((subcategory) =>
          Object.values(subcategory.lines || {})
        );

        if (flatLines.length === 0) {
          enqueueSnackbar(
            "No hay líneas para guardar. Agrega al menos una línea.",
            {
              variant: "warning",
            }
          );
          return;
        }

        // Transform to API request format
        const requestData = mapLinesToRequest(flatLines);

        await updateCarbonInventoryLinesMutation.mutateAsync({
          id: inventoryId,
          data: requestData,
        });

        enqueueSnackbar("Líneas de emisión guardadas exitosamente", {
          variant: "success",
        });

        onSuccess?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error al guardar las líneas de emisión:", error);
        enqueueSnackbar("Error al guardar las líneas de emisión", {
          variant: "error",
        });
      }
    },
    [
      inventoryId,
      enqueueSnackbar,
      updateCarbonInventoryLinesMutation,
      onSuccess,
    ]
  );

  return {
    submit,
    isSubmitting: updateCarbonInventoryLinesMutation.isPending,
  };
};
