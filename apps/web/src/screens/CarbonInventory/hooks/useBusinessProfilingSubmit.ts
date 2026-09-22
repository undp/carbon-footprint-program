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
  /**
   * Puts the stored year back in the form when the user declines the change.
   * The dialog offers «Mantener el año actual», and the hook has no reach into
   * the form, so the screen supplies the restore.
   */
  onKeepYear?: () => void;
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
  onKeepYear,
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
      if (inventory === undefined) {
        // Both checks below read the detail query. While it has not resolved —
        // or if it errored — neither whether the year changed nor whether there
        // are lines to lose can be answered, so the save is confirmed instead
        // of applied: a warning nobody needed is recoverable, silently wiping
        // every captured factor is not.
        setPendingRequest(requestData);
        return;
      }

      const yearChanged =
        requestData.year !== undefined && requestData.year !== inventory.year;
      const hasDeclaredLines = inventory.subcategories.some(
        (subcategory) => subcategory.lines.length > 0
      );

      if (yearChanged && hasDeclaredLines) {
        setPendingRequest(requestData);
        return;
      }

      // The year travels only when it actually changed. The form always emits
      // it — the field is required and never empty — and a payload carrying it
      // is precisely what tells `useUpdateCarbonInventory` that the frozen
      // factors may be gone and the emissions views have to refetch, so sending
      // it unchanged made every rename refetch the whole dashboard.
      await persist(
        yearChanged ? requestData : { ...requestData, year: undefined }
      );
    },
    [inventoryId, enqueueSnackbar, onSuccess, inventory, persist]
  );

  const confirmYearChange = useCallback(() => {
    if (!pendingRequest) return;
    // The request is held until the mutation settles so the dialog stays open —
    // and keeps showing its loading state — while the transaction that clears
    // every frozen factor runs. Releasing it first closed the dialog on the
    // same render the PATCH started, leaving the user without feedback and a
    // second «Guardar» one click away. `persist` handles its own errors, so
    // `finally` is what closes the dialog on either outcome.
    void persist(pendingRequest).finally(() => setPendingRequest(null));
  }, [pendingRequest, persist]);

  // Declining is not the same as doing nothing. The save is dropped, so the
  // year the user picked has to be dropped with it: left in the field it would
  // contradict the button that was just pressed, reopen this dialog on the next
  // «Siguiente», and — because the save never reached the API — take every
  // other edit of the form down with it, silently. Restoring the stored year is
  // what lets the next attempt save the rest and move on.
  const cancelYearChange = useCallback(() => {
    setPendingRequest(null);
    onKeepYear?.();
  }, [onKeepYear]);

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
