import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useUpdateCarbonInventory } from "@/api/query";
import { BusinessProfilingFormValues } from "./useBusinessProfilingForm";
import { mapFormValuesToRequest } from "../utils/businessProfilingTransformers";

type Params = {
  inventoryId?: string;
  onSuccess?: () => void;
};

interface HookResult {
  submit: (
    data: BusinessProfilingFormValues,
    isDirty: boolean
  ) => Promise<void>;
  isSubmitting: boolean;
}

export const useBusinessProfilingSubmit = ({
  inventoryId,
  onSuccess,
}: Params): HookResult => {
  const { enqueueSnackbar } = useSnackbar();
  const updateCarbonInventoryMutation = useUpdateCarbonInventory(
    inventoryId ?? ""
  );

  const submit = useCallback(
    async (data: BusinessProfilingFormValues, isDirty: boolean) => {
      if (!isDirty) {
        onSuccess?.();
        return;
      }

      try {
        if (!inventoryId) {
          enqueueSnackbar("No se encontró la huella organizacional a editar", {
            variant: "error",
          });
          return;
        }

        const requestData = mapFormValuesToRequest(data);
        await updateCarbonInventoryMutation.mutateAsync(requestData);

        enqueueSnackbar("Huella guardada exitosamente", {
          variant: "success",
        });

        onSuccess?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error al guardar la huella organizacional:", error);
        enqueueSnackbar("Error al guardar la huella organizacional", {
          variant: "error",
        });
      }
    },
    [inventoryId, enqueueSnackbar, updateCarbonInventoryMutation, onSuccess]
  );

  return { submit, isSubmitting: updateCarbonInventoryMutation.isPending };
};
