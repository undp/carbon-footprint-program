import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  EmissionCaptureFormValues,
  EmissionCaptureMergedData,
  EmissionCaptureFormLine,
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
const createNewLine = (subcategoryId: string): EmissionCaptureFormLine => {
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

  useEffect(() => {
    // STEP 1: Preserve manual total emissions and new lines from current form state before reset
    const currentFormValues = getValues();
    const preservedManualTotals: Record<string, number> = {};
    const preservedNewLines: Record<string, EmissionCaptureFormLine[]> = {};
    const preservedDeletedLineIds: Record<string, string[]> = {};

    // Extract and preserve data for each subcategory
    Object.entries(currentFormValues.subcategories || {}).forEach(
      ([subcatId, subcatData]) => {
        // Preserve manual total emissions for subcategories in manual mode
        if (subcatData.isTotalManualEmissionsMode) {
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

    const subcategoriesToForceSync: string[] = [];

    data?.categories.forEach((category) => {
      category.subcategories.forEach((subcategory: SubcategoryWithLines) => {
        // Start with server lines (excluding those marked for deletion)
        const serverLines = subcategory.lines.filter(
          (line) =>
            !preservedDeletedLineIds[subcategory.id]?.includes(line.lineId)
        );

        const linesRecord = serverLines.reduce(
          (acc, line) => {
            acc[line.id] = { ...line, isNew: false, isDeleted: false };
            return acc;
          },
          {} as Record<string, EmissionCaptureFormLine>
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
          };
        });

        formData.subcategories[subcategory.id] = {
          lines: linesRecord,
          isTotalManualEmissionsMode: subcategory.isTotalManualEmissionsMode,
        };

        // Detect if the mode changed OR if it's dirty (touched by user)
        const isModeDirty =
          !!dirtyFields.subcategories?.[subcategory.id]
            ?.isTotalManualEmissionsMode;

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
      if (subcatData && subcatData.isTotalManualEmissionsMode) {
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
    (subcategoryId: string) => {
      const newLine = createNewLine(subcategoryId);
      const currentLines = getValues(`subcategories.${subcategoryId}.lines`);

      setValue(
        `subcategories.${subcategoryId}.lines`,
        {
          ...currentLines,
          [newLine.lineId]: newLine,
        },
        { shouldDirty: true }
      );

      return newLine;
    },
    [getValues, setValue]
  );

  /**
   * Removes a line from a subcategory locally.
   * - For new lines (isNew: true): removes them completely from the form state.
   * - For existing server lines: marks them as isDeleted: true (they will be deleted on submit).
   */
  const removeLine = useCallback(
    (subcategoryId: string, lineId: string) => {
      const currentLines = getValues(`subcategories.${subcategoryId}.lines`);
      const lineToRemove = currentLines?.[lineId];

      if (!lineToRemove) return;

      if (lineToRemove.isNew) {
        // For new lines, remove them completely from the form state
        const { [lineId]: _, ...remainingLines } = currentLines;
        setValue(`subcategories.${subcategoryId}.lines`, remainingLines, {
          shouldDirty: true,
        });
      } else {
        // For existing server lines, mark them as deleted
        setValue(
          `subcategories.${subcategoryId}.lines.${lineId}.isDeleted`,
          true,
          { shouldDirty: true }
        );
      }
    },
    [getValues, setValue]
  );

  /**
   * Resets the form state after a successful save.
   * This clears isNew flags on created lines (they now exist on server),
   * removes deleted lines completely (they no longer exist on server),
   * and resets the dirty state.
   */
  const resetAfterSave = useCallback(() => {
    const currentValues = getValues();
    const cleanedFormData: EmissionCaptureFormValues = {
      subcategories: {},
    };

    Object.entries(currentValues.subcategories || {}).forEach(
      ([subcatId, subcatData]) => {
        const cleanedLines: Record<string, EmissionCaptureFormLine> = {};

        Object.entries(subcatData.lines || {}).forEach(([lineId, line]) => {
          // Skip deleted lines - they no longer exist on the server
          if (line.isDeleted) {
            return;
          }

          // For lines that were new but are now saved, mark them as not new
          cleanedLines[lineId] = {
            ...line,
            isNew: false,
            isDeleted: false,
          };
        });

        cleanedFormData.subcategories[subcatId] = {
          ...subcatData,
          lines: cleanedLines,
        };
      }
    );

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
  };
};
