import { useCallback, useState } from "react";
import { useSnackbar } from "notistack";
import { UpdateCarbonInventoryRequest } from "@repo/types";
import { useCarbonInventory, useUpdateCarbonInventory } from "@/api/query";
import { BusinessProfilingFormValues } from "./useBusinessProfilingForm";
import { mapFormValuesToRequest } from "../utils/businessProfilingTransformers";
import { VOCAB } from "@/config/vocab";

type Params = {
  inventoryId?: string;
  onSuccess?: () => void;
};

export interface YearChangeConfirmation {
  isOpen: boolean;
  confirm: () => void;
  cancel: () => void;
}

interface HookResult {
  submit: (
    data: BusinessProfilingFormValues,
    isDirty: boolean
  ) => Promise<void>;
  isSubmitting: boolean;
  /**
   * Drives the warning shown before a year change reaches the API. The screen
   * renders the dialog; the condition lives here so that every exit that saves
   * the year is covered by the same guard.
   */
  yearChangeConfirmation: YearChangeConfirmation;
}

export const useBusinessProfilingSubmit = ({
  inventoryId,
  onSuccess,
}: Params): HookResult => {
  const { enqueueSnackbar } = useSnackbar();
  const updateCarbonInventoryMutation = useUpdateCarbonInventory(
    inventoryId ?? ""
  );
  // Already in the cache — the screen renders from this same query.
  const { data: inventory } = useCarbonInventory(inventoryId ?? "");
  const [pendingRequest, setPendingRequest] =
    useState<UpdateCarbonInventoryRequest | null>(null);

  const persist = useCallback(
    async (requestData: UpdateCarbonInventoryRequest) => {
      try {
        await updateCarbonInventoryMutation.mutateAsync(requestData);

        enqueueSnackbar("Huella guardada exitosamente", {
          variant: "success",
        });

        onSuccess?.();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `Error al guardar la huella ${VOCAB.organization.relationalAdjective}:`,
          error
        );
        enqueueSnackbar(
          `Error al guardar la huella ${VOCAB.organization.relationalAdjective}`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, updateCarbonInventoryMutation, onSuccess]
  );

  const submit = useCallback(
    async (data: BusinessProfilingFormValues, isDirty: boolean) => {
      if (!isDirty) {
        onSuccess?.();
        return;
      }

      if (!inventoryId) {
        enqueueSnackbar(
          `No se encontró la huella ${VOCAB.organization.relationalAdjective} a editar`,
          {
            variant: "error",
          }
        );
        return;
      }

      const requestData = mapFormValuesToRequest(data);

      // Changing the year clears the frozen catalogue factor of every declared
      // line, so it is confirmed before it is applied — and confirmed here
      // rather than at the call sites, because step 1 has two exits that save
      // (advancing, and saving on the way out) and both funnel through this
      // `submit`. Guarding here covers both, and covers a third exit if one is
      // ever added. Warning when the field itself changes was rejected: a user
      // who reverts the year or abandons without saving would have been alarmed
      // about something that never happened.
      const yearChanged =
        requestData.year !== undefined && requestData.year !== inventory?.year;
      const hasDeclaredLines = (inventory?.subcategories ?? []).some(
        (subcategory) => subcategory.lines.length > 0
      );

      if (yearChanged && hasDeclaredLines) {
        setPendingRequest(requestData);
        return;
      }

      await persist(requestData);
    },
    [inventoryId, enqueueSnackbar, onSuccess, inventory, persist]
  );

  const confirmYearChange = useCallback(() => {
    if (!pendingRequest) return;
    const requestData = pendingRequest;
    setPendingRequest(null);
    void persist(requestData);
  }, [pendingRequest, persist]);

  const cancelYearChange = useCallback(() => setPendingRequest(null), []);

  return {
    submit,
    isSubmitting: updateCarbonInventoryMutation.isPending,
    yearChangeConfirmation: {
      isOpen: pendingRequest !== null,
      confirm: confirmYearChange,
      cancel: cancelYearChange,
    },
  };
};
