import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useUpdateCarbonInventory } from "@/api/query";
import { BusinessProfilingFormValues } from "./useBusinessProfilingForm";
import { mapFormValuesToRequest } from "../utils/businessProfilingTransformers";

type Params = {
  inventoryId?: string;
  onSuccess?: () => void;
};

export const useBusinessProfilingSubmit = ({
  inventoryId,
  onSuccess,
}: Params) => {
  const { enqueueSnackbar } = useSnackbar();
  const updateCarbonInventoryMutation = useUpdateCarbonInventory();

  const submit = useCallback(
    async (data: BusinessProfilingFormValues) => {
      try {
        if (!inventoryId) {
          enqueueSnackbar("No se encontró el inventario a editar", {
            variant: "error",
          });
          return;
        }

        const requestData = mapFormValuesToRequest(data);
        await updateCarbonInventoryMutation.mutateAsync({
          id: inventoryId,
          data: requestData,
        });

        enqueueSnackbar("Inventario organizacional guardado exitosamente", {
          variant: "success",
        });

        onSuccess?.();
      } catch {
        enqueueSnackbar("Error al guardar el inventario organizacional", {
          variant: "error",
        });
      }
    },
    [inventoryId, enqueueSnackbar, updateCarbonInventoryMutation, onSuccess]
  );

  return { submit, isSubmitting: updateCarbonInventoryMutation.isPending };
};
