import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useSyncCarbonInventoryLines } from "@/api/query/carbonInventories/lines/useSyncCarbonInventoryLines";
import {
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
} from "../types/EmissionCaptureTypes";
import { mapLinesToSyncRequest } from "../utils/emissionCaptureTransformers";
import { VOCAB } from "@/config/vocab";

interface Params {
  inventoryId: string;
  onSuccess?: () => void;
  isDirty?: boolean;
  getDirtyLineIds?: () => Set<string>;
  resetAfterSave?: () => void;
  throwOnError?: boolean;
  resultFeedbackWithSnackbar?: boolean;
  showNoChangesMessage?: boolean;
}

interface HookResult {
  submit: (data: EmissionCaptureFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export const useEmissionCaptureSubmit = ({
  inventoryId,
  onSuccess,
  isDirty,
  getDirtyLineIds,
  resetAfterSave,
  resultFeedbackWithSnackbar = true,
  throwOnError = false,
  showNoChangesMessage = true,
}: Params): HookResult => {
  const { enqueueSnackbar } = useSnackbar();
  const { mutateAsync, isPending } = useSyncCarbonInventoryLines(inventoryId);

  const submit = useCallback(
    async (data: EmissionCaptureFormValues) => {
      try {
        if (!inventoryId) {
          enqueueSnackbar(
            `No se encontró la huella ${VOCAB.organization.relationalAdjective} a editar`,
            {
              variant: "error",
            }
          );
          return;
        }

        if (!isDirty) {
          if (showNoChangesMessage) {
            enqueueSnackbar("No hay cambios para guardar", {
              variant: "info",
            });
          }
          onSuccess?.();
          return;
        }

        // Get all lines from all subcategories as a flat array
        const allSubcategories = Object.values(data.subcategories || {});
        const flatLines: EmissionCaptureFormLine[] = allSubcategories.flatMap(
          (subcategory) => Object.values(subcategory.lines || {})
        );

        // Check if there are any active (non-deleted) lines
        const activeLines = flatLines.filter((line) => !line.isDeleted);
        const hasDeletedLines = flatLines.some(
          (line) => line.isDeleted && !line.isNew
        );

        if (activeLines.length === 0 && !hasDeletedLines) {
          enqueueSnackbar(
            "No hay líneas para guardar. Agrega al menos una línea.",
            {
              variant: "warning",
            }
          );
          return;
        }

        // Transform to sync API request format (only dirty lines are sent as updates)
        const dirtyLineIds = getDirtyLineIds?.();
        const syncRequest = mapLinesToSyncRequest(flatLines, dirtyLineIds);

        await mutateAsync({
          data: syncRequest,
        });

        // Reset form state after successful save to clear isNew/isDeleted flags
        resetAfterSave?.();

        if (resultFeedbackWithSnackbar)
          enqueueSnackbar("Huella guardada exitosamente", {
            variant: "success",
          });

        onSuccess?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error al guardar las líneas de emisión:", error);
        if (resultFeedbackWithSnackbar)
          enqueueSnackbar("Error al guardar la huella", {
            variant: "error",
          });
        if (throwOnError) throw error;
      }
    },
    [
      inventoryId,
      isDirty,
      getDirtyLineIds,
      enqueueSnackbar,
      mutateAsync,
      onSuccess,
      resetAfterSave,
      resultFeedbackWithSnackbar,
      throwOnError,
      showNoChangesMessage,
    ]
  );

  return {
    submit,
    isSubmitting: isPending,
  };
};
