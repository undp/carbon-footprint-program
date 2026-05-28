import { useCallback, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  EmissionCaptureFormValues,
  EmissionCaptureMergedData,
  EmissionCaptureFormLine,
  SubcategoryId,
  LineId,
} from "../types/EmissionCaptureTypes";
import { SubcategoryWithLines } from "../types/EmissionCaptureTypes";

type Params = {
  data: EmissionCaptureMergedData;
};

const defaultValues: EmissionCaptureFormValues = {
  subcategories: {},
};

/**
 * Creates a new empty line with a temporary ID.
 * New lines are marked with isNew: true and will be created on the server when submitting.
 */
const createNewLine = (
  subcategoryId: SubcategoryId
): EmissionCaptureFormLine => {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: tempId,
    lineId: tempId,
    subcategoryId,
    isManualTotalEmissions: false,
    dimensionValue1Id: null,
    dimensionValue2Id: null,
    quantity: null,
    measurementUnitId: null,
    factorSource: null,
    factorValue: null,
    factorRateMeasurementUnitId: null,
    comment: null,
    manualTotalEmissions: null,
    baseFactorId: null,
    isNew: true,
    isDeleted: false,
    files: [],
    removedFileIds: [],
  };
};

// apps/web/src/screens/CarbonInventory/hooks/useEmissionCaptureForm.ts

export const useEmissionCaptureForm = ({ data }: Params) => {
  const form = useForm<EmissionCaptureFormValues>({
    defaultValues,
    mode: "onChange",
  });

  const { reset, getValues, resetField, setValue } = form;

  const dirtyFields = form.formState.dirtyFields;

  // Ref to track if we're waiting for fresh data after a save.
  // This prevents the reconciliation useEffect from re-applying stale data
  // between when resetAfterSave is called and when the refetch completes.
  const waitingForFreshDataRef = useRef(false);
  // Track the last data reference to detect when fresh data arrives
  const lastDataRef = useRef(data);

  useEffect(() => {
    // If we're waiting for fresh data, check if data has changed
    if (waitingForFreshDataRef.current) {
      if (data === lastDataRef.current) {
        // Data hasn't changed yet, skip reconciliation
        return;
      }
      // Fresh data has arrived, clear the flag and proceed with reconciliation
      waitingForFreshDataRef.current = false;
    }
    lastDataRef.current = data;
    // STEP 1: Preserve manual total emissions and new lines from current form state before reset
    const currentFormValues = getValues();
    const preservedManualTotals: Record<SubcategoryId, number> = {};
    const preservedNewLines: Record<SubcategoryId, EmissionCaptureFormLine[]> =
      {};
    const preservedDeletedLineIds: Record<SubcategoryId, LineId[]> = {};

    // Extract and preserve data for each subcategory
    Object.entries(currentFormValues.subcategories || {}).forEach(
      ([subcatId, subcatData]) => {
        // Preserve manual total emissions for subcategories in manual mode
        if (subcatData.isTotalManualEmissionsModeActive) {
          const lines = Object.values(subcatData.lines || {});
          const manualTotal = lines[0]?.manualTotalEmissions;
          if (manualTotal !== undefined && manualTotal !== null) {
            preservedManualTotals[subcatId] = manualTotal;
          }
        }

        // Preserve new lines (lines created locally but not yet saved to the server)
        const newLines = Object.values(subcatData.lines || {}).filter(
          (line) => line.isNew && !line.isDeleted
        );
        if (newLines.length > 0) {
          preservedNewLines[subcatId] = newLines;
        }

        // Preserve deleted line IDs (server lines marked for deletion)
        const deletedLineIds = Object.values(subcatData.lines || {})
          .filter((line) => line.isDeleted && !line.isNew)
          .map((line) => line.lineId);
        if (deletedLineIds.length > 0) {
          preservedDeletedLineIds[subcatId] = deletedLineIds;
        }
      }
    );

    const formData: EmissionCaptureFormValues = {
      subcategories: {},
    };

    const subcategoriesToForceSync: SubcategoryId[] = [];

    data?.categories.forEach((category) => {
      category.subcategories.forEach((subcategory: SubcategoryWithLines) => {
        // Start with server lines (excluding those marked for deletion)
        const serverLines = subcategory.lines.filter(
          (line) =>
            !preservedDeletedLineIds[subcategory.id]?.includes(line.lineId)
        );

        const linesRecord = serverLines.reduce(
          (acc, line) => {
            acc[line.id] = {
              ...line,
              isNew: false,
              isDeleted: false,
              files: line.files ?? [],
              removedFileIds: [],
            };
            return acc;
          },
          {} as Record<LineId, EmissionCaptureFormLine>
        );

        // Add back the new lines that were created locally
        const newLines = preservedNewLines[subcategory.id] || [];
        newLines.forEach((line) => {
          linesRecord[line.lineId] = line;
        });

        // Add deleted lines (hidden but tracked) for server deletion on submit
        const deletedServerLines = subcategory.lines.filter((line) =>
          preservedDeletedLineIds[subcategory.id]?.includes(line.lineId)
        );
        deletedServerLines.forEach((line) => {
          linesRecord[line.lineId] = {
            ...line,
            isNew: false,
            isDeleted: true,
            files: line.files ?? [],
            removedFileIds: [],
          };
        });

        formData.subcategories[subcategory.id] = {
          categoryId: category.id,
          lines: linesRecord,
          isTotalManualEmissionsModeActive:
            subcategory.isTotalManualEmissionsModeActive,
          isTotalManualEmissionsModeAvailable:
            subcategory.isTotalManualEmissionsModeAvailable,
        };

        // Detect if the mode changed OR if it's dirty (touched by user)
        const isModeDirty =
          !!dirtyFields.subcategories?.[subcategory.id]
            ?.isTotalManualEmissionsModeActive;

        if (isModeDirty) subcategoriesToForceSync.push(subcategory.id);
      });
    });

    // 2. first, we apply the global reset to match the database state keeping user changes
    reset(formData, { keepDirtyValues: true, keepErrors: true });

    // 3. for the subcategories that changed mode, we use a stronger hammer to force the value of the database
    subcategoriesToForceSync.forEach((id) => {
      // we use setValue to force the value of the database of the entire subcategory
      // but with shouldDirty: false to clean the state of "edited"
      setValue(`subcategories.${id}`, formData.subcategories[id], {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });

      // then resetField on the entire subcategory to clean dirtyFields internally
      resetField(`subcategories.${id}`, {
        defaultValue: formData.subcategories[id],
      });
    });

    // STEP 4: Restore preserved manual total emissions
    Object.entries(preservedManualTotals).forEach(([subcatId, total]) => {
      const subcatData = formData.subcategories[subcatId];
      if (subcatData && subcatData.isTotalManualEmissionsModeActive) {
        const lineIds = Object.keys(subcatData.lines || {});
        const targetLineId = lineIds[0];

        if (targetLineId) {
          setValue(
            `subcategories.${subcatId}.lines.${targetLineId}.manualTotalEmissions`,
            total,
            { shouldDirty: true }
          );
        }
      }
    });
  }, [data, reset, getValues, resetField, setValue, dirtyFields]);

  /**
   * Adds a new line to a subcategory locally.
   * The line is marked with isNew: true and will be created on the server when submitting.
   */
  const addLine = useCallback(
    (subcategoryId: SubcategoryId) => {
      const newLine = createNewLine(subcategoryId);

      setValue(
        `subcategories.${subcategoryId}.lines.${newLine.lineId}`,
        newLine,
        { shouldDirty: true }
      );

      return newLine;
    },
    [setValue]
  );

  /**
   * Removes a line from a subcategory locally.
   * - For new lines (isNew: true): removes them completely from the form state.
   * - For existing server lines: marks them as isDeleted: true (they will be deleted on submit).
   */
  const removeLine = useCallback(
    (subcategoryId: SubcategoryId, lineId: LineId) => {
      const currentLines = getValues(`subcategories.${subcategoryId}.lines`);
      const lineToRemove = currentLines?.[lineId];

      if (!lineToRemove) return;

      // Mark the line as deleted
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.isDeleted`,
        true,
        { shouldDirty: true }
      );
    },
    [getValues, setValue]
  );

  /**
   * Resets the form state after a successful save.
   * This clears isNew flags on created lines (they now exist on server),
   * removes deleted lines completely (they no longer exist on server),
   * and resets the dirty state.
   */
  /**
   * Returns the set of line IDs that have been modified by the user.
   * Reads from form.formState.dirtyFields at call time so it's always up-to-date.
   */
  const getDirtyLineIds = useCallback((): Set<string> => {
    const dirtyLineIds = new Set<string>();
    const currentDirtyFields = form.formState.dirtyFields;
    const subcategories = currentDirtyFields?.subcategories;
    if (subcategories) {
      for (const subcatDirty of Object.values(subcategories)) {
        const linesDirty = (subcatDirty as Record<string, unknown>)?.lines;
        if (linesDirty && typeof linesDirty === "object") {
          for (const lineId of Object.keys(linesDirty)) {
            dirtyLineIds.add(lineId);
          }
        }
      }
    }
    return dirtyLineIds;
  }, [form]);

  /**
   * Scoped variant of resetAfterSave for a single subcategory.
   *
   * Used by the manual-mode toggle, whose submit path persists only the toggled
   * subcategory and does NOT run the global resetAfterSave (which would clobber
   * unsaved new lines in OTHER subcategories). It drops that subcategory's
   * temp/new and just-deleted lines and clears their dirty state, so the refetch
   * triggered after the toggle repopulates them with their server ids instead of
   * duplicating them alongside the freshly created server rows.
   *
   * It works at the `subcategories.${id}` level (not over `*.lines` directly),
   * mirroring the force-sync hammer in the reconciliation effect:
   * - `setValue` unconditionally replaces the subcategory node in `_formValues`,
   *   dropping the temp lines so the refetch can't merge them into duplicates.
   *   This is what prevents duplication and must NOT rely on resetField alone,
   *   which is a no-op when the subcategory's fields aren't registered (e.g. the
   *   grid collapsed to total mode unmounted the line cells).
   * - `resetField` then clears the dirty/touched state and updates the defaults.
   * It also sets `waitingForFreshDataRef` so the dirtyFields change does not
   * re-fire the reconciliation effect against stale (pre-refetch) data.
   */
  const resetAfterSaveForSubcategory = useCallback(
    (subcategoryId: SubcategoryId) => {
      const subcatData = getValues().subcategories?.[subcategoryId];
      if (!subcatData) return;

      // Keep only the already-persisted lines; the temp/new and just-deleted
      // ones are dropped so the refetch repopulates them with their server ids.
      const cleanedLines = Object.fromEntries(
        Object.entries(subcatData.lines || {}).filter(
          ([, line]) => !line.isNew && !line.isDeleted
        )
      );

      const cleanedSubcategory = { ...subcatData, lines: cleanedLines };

      // Suppress the stale reconciliation pass that the dirtyFields change from
      // resetField would otherwise trigger before the refetch lands.
      waitingForFreshDataRef.current = true;

      setValue(`subcategories.${subcategoryId}`, cleanedSubcategory, {
        shouldDirty: false,
        shouldTouch: false,
      });
      resetField(`subcategories.${subcategoryId}`, {
        defaultValue: cleanedSubcategory,
      });
    },
    [getValues, setValue, resetField]
  );

  const resetAfterSave = useCallback(() => {
    const currentValues = getValues();
    const cleanedFormData: EmissionCaptureFormValues = {
      subcategories: {},
    };

    Object.entries(currentValues.subcategories || {}).forEach(
      ([subcatId, subcatData]) => {
        const cleanedLines: Record<LineId, EmissionCaptureFormLine> = {};

        Object.entries(subcatData.lines || {}).forEach(([lineId, line]) => {
          // Skip deleted lines - they no longer exist on the server
          if (line.isDeleted) {
            return;
          }

          // For lines that were new but are now saved, mark them as not new.
          // Clear file-related client state — the server response will
          // re-populate `files[]` on the next reconciliation, and
          // `removedFileIds` was already consumed by the sync transaction.
          cleanedLines[lineId] = {
            ...line,
            isNew: false,
            isDeleted: false,
            files: [],
            removedFileIds: [],
          };
        });

        cleanedFormData.subcategories[subcatId] = {
          ...subcatData,
          lines: cleanedLines,
        };
      }
    );

    // Set flag to wait for fresh data before reconciling again.
    // This prevents the useEffect from re-applying stale server data
    // between now and when the refetch completes.
    waitingForFreshDataRef.current = true;

    // Reset the form with cleaned data, clearing the dirty state
    reset(cleanedFormData, {
      keepErrors: false,
      keepDirty: false,
      keepDirtyValues: false,
      keepValues: false,
      keepDefaultValues: false,
      keepIsSubmitted: false,
      keepTouched: false,
      keepIsValid: false,
      keepSubmitCount: false,
    });
  }, [getValues, reset]);

  return {
    ...form,
    addLine,
    removeLine,
    resetAfterSave,
    resetAfterSaveForSubcategory,
    getDirtyLineIds,
  };
};
