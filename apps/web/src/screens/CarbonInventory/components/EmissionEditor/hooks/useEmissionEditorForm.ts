import { useCallback, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useParams } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { EmissionFactor, RateMeasurementUnit } from "@repo/types";
import { Routes } from "@/interfaces";
import {
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
  SubcategoryWithLines,
  SubcategoryId,
  LineId,
} from "../../../types/EmissionCaptureTypes";
import {
  getCompatibleRateUnitId,
  getAvailableFactors,
} from "../services/emissionFactorService";
import { useToggleManualTotalEmissions } from "@/api/query/carbonInventories/subcategories/useToggleManualTotalEmissions";
import { useEmissionCaptureState } from "../../../hooks/useEmissionCaptureState";
import { useEmissionCaptureSubmit } from "../../../hooks/useEmissionCaptureSubmit";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";

interface UseEmissionEditorFormParams {
  subcategory: SubcategoryWithLines;
  emissionFactors: EmissionFactor[];
  rateMeasurementUnits: RateMeasurementUnit[];
}

interface UseEmssionEditorFormResults {
  rows: EmissionCaptureFormLine[];
  isTotalManualEmissionsModeLoading: boolean;
  isTotalManualEmissionsMode: boolean;
  handleAddLine: () => void;
  handleCellChange: (
    value: string | number | null,
    params: {
      field: string;
      row: EmissionCaptureFormLine;
    }
  ) => void;
  handleFactorSourceChange: (lineId: LineId, newFactorSource: string) => void;
  handleDeleteLine: (lineId: LineId) => void;
  handleSetTotalEmission: (total: number) => void;
  handleSetManualMode: (isManual: boolean) => Promise<void>;
}

// Extended form context type that includes addLine and removeLine
interface ExtendedFormContext {
  addLine: (subcategoryId: SubcategoryId) => EmissionCaptureFormLine;
  removeLine: (subcategoryId: SubcategoryId, lineId: LineId) => void;
}

export const useEmissionEditorForm = ({
  subcategory,
  emissionFactors,
  rateMeasurementUnits,
}: UseEmissionEditorFormParams): UseEmssionEditorFormResults => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });

  const { enqueueSnackbar } = useSnackbar();

  const { id: subcategoryId } = subcategory;

  const { mutateAsync: toggleManualMode } = useToggleManualTotalEmissions(
    inventoryId,
    subcategoryId
  );

  // startAction/endAction are still needed for manual mode toggle which calls the API
  const startAction = useEmissionCaptureState((state) => state.startAction);
  const endAction = useEmissionCaptureState((state) => state.endAction);

  const [
    isTotalManualEmissionsModeLoading,
    setIsTotalManualEmissionsModeLoading,
  ] = useState(false);

  const { submit } = useEmissionCaptureSubmit({
    inventoryId,
    isDirty: true, // Always submit on manual mode toggle to persist pending changes
    resultFeedbackWithSnackbar: false,
    throwOnError: true,
  });

  const [isLocalTotalManualEmissionsMode, setIsLocalTotalManualEmissionsMode] =
    useState<boolean | null>(null);

  // Get standard form context methods
  const formContext = useFormContext<EmissionCaptureFormValues>();
  const { setValue, getValues } = formContext;

  // Get extended methods (addLine, removeLine) from the form context
  // These are added by useEmissionCaptureForm
  const { addLine, removeLine } = formContext as unknown as ExtendedFormContext;

  // Watch lines from form state to get reactive updates
  const formLines = useWatch({
    control: formContext.control,
    name: `subcategories.${subcategoryId}.lines` as const,
  }) as Record<string, EmissionCaptureFormLine> | undefined;

  // Filter out deleted lines for display and convert to array
  const rows = useMemo(() => {
    const linesRecord = formLines || {};
    return Object.values(linesRecord).filter(
      (line): line is EmissionCaptureFormLine =>
        line !== undefined && !line.isDeleted
    );
  }, [formLines]);

  const isTotalManualEmissionsMode = useMemo(() => {
    return (
      isLocalTotalManualEmissionsMode ?? subcategory.isTotalManualEmissionsMode
    );
  }, [isLocalTotalManualEmissionsMode, subcategory.isTotalManualEmissionsMode]);

  // Form actions - now local only, no API calls
  const handleAddLine = useCallback(() => {
    // Add line locally - will be persisted on form submit
    addLine(subcategoryId);
  }, [addLine, subcategoryId]);

  const resetFactorRelatedFields = useCallback(
    (subcategoryId: SubcategoryId, lineId: LineId) => {
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
        null,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.baseFactorId`,
        null,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
        null,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorRateMeasurementUnitId`,
        null,
        { shouldDirty: true }
      );
    },
    [setValue]
  );

  const resetFactorValueField = useCallback(
    (subcategoryId: SubcategoryId, lineId: LineId) => {
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.baseFactorId`,
        null,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
        null,
        { shouldDirty: true }
      );
    },
    [setValue]
  );

  const handleFactorSourceChange = useCallback(
    (lineId: string) => {
      const line = getValues(
        `subcategories.${subcategoryId}.lines.${lineId}`
      ) as EmissionCaptureFormLine | undefined;
      if (!line) return;

      const compatibleRateUnitId = getCompatibleRateUnitId(
        line.measurementUnitId,
        rateMeasurementUnits
      );

      const availableFactors = getAvailableFactors(
        emissionFactors,
        line.dimensionValue1Id,
        line.dimensionValue2Id,
        compatibleRateUnitId
      );

      if (!availableFactors.length) {
        // eslint-disable-next-line no-console
        console.warn(
          "There are no available factors for the selected parameters. Cannot auto-select a factor."
        );
        return;
      }

      if (availableFactors.length > 1) {
        // eslint-disable-next-line no-console
        console.warn(
          "There are multiple available factors for the selected parameters. Cannot auto-select a factor."
        );
        return;
      }

      const factor = availableFactors[0];
      const factorValue = parseFloat(factor.value);

      if (isNaN(factorValue)) {
        // eslint-disable-next-line no-console
        console.warn(
          "The available factor has an invalid value. Cannot auto-select a factor."
        );
        return;
      }

      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
        factor.source,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.baseFactorId`,
        factor.originalEmissionFactorId,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
        factorValue,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorRateMeasurementUnitId`,
        factor.rateMeasurementUnitId,
        { shouldDirty: true }
      );
    },
    [emissionFactors, rateMeasurementUnits, setValue, subcategoryId, getValues]
  );

  const tryToLoadDetermineFactorPlatform = useCallback(
    (
      subcategoryId: SubcategoryWithLines["id"],
      lineId: EmissionCaptureFormLine["id"]
    ) => {
      const formLine = getValues(
        `subcategories.${subcategoryId}.lines.${lineId}`
      );
      const isFirstDimensionRequired = subcategory.dimensions.find(
        ({ position }) => position === 1
      )?.isRequired;

      const isSecondDimensionRequired = subcategory.dimensions.find(
        ({ position }) => position === 2
      )?.isRequired;

      const areAllRequiredFieldsSelected =
        (!isFirstDimensionRequired || formLine.dimensionValue1Id !== null) &&
        (!isSecondDimensionRequired || formLine.dimensionValue2Id !== null) &&
        formLine.measurementUnitId !== null;

      const isOwnFactorSelected =
        !!formLine.factorSource &&
        CUSTOM_FACTOR_SOURCES.includes(formLine.factorSource);

      if (!isOwnFactorSelected && areAllRequiredFieldsSelected) {
        handleFactorSourceChange(lineId);
      }
    },
    [subcategory, getValues, handleFactorSourceChange]
  );

  const handleCellChange = useCallback(
    (
      value: string | number | null,
      params: {
        field: string;
        row: EmissionCaptureFormLine;
      }
    ) => {
      const { field, row } = params;

      const factorSource = getValues(
        `subcategories.${subcategoryId}.lines.${row.lineId}.factorSource`
      );

      const isOwnFactorSelected =
        !!factorSource && CUSTOM_FACTOR_SOURCES.includes(factorSource);

      const areDimensionsHierarchical = subcategory.dimensions.some((dim) =>
        dim.values.some((val) => val.parentValueId !== null)
      );

      setValue(
        `subcategories.${subcategoryId}.lines.${row.lineId}.${field}`,
        value as never,
        { shouldDirty: true }
      );

      // resets derivados
      // Goal: reset factor-related fields when dimensions or measurement unit change
      // If factorSource is "Factor Propio"/"Otro", only resetting when measurementUnitId changes
      if (field === "dimensionValue1Id") {
        const isRequired = subcategory.dimensions.find(
          ({ position }) => position === 1
        )?.isRequired;

        if (isRequired && areDimensionsHierarchical) {
          setValue(
            `subcategories.${subcategoryId}.lines.${row.lineId}.dimensionValue2Id`,
            null,
            { shouldDirty: true }
          );
        }

        if (isRequired && !isOwnFactorSelected)
          resetFactorRelatedFields(subcategoryId, row.lineId);
      }

      if (field === "dimensionValue2Id") {
        const isRequired = subcategory.dimensions.find(
          ({ position }) => position === 2
        )?.isRequired;
        if (isRequired && !isOwnFactorSelected)
          resetFactorRelatedFields(subcategoryId, row.lineId);
      }

      if (field === "measurementUnitId")
        resetFactorValueField(subcategoryId, row.lineId);

      // Try to fill a platform factor if possible
      tryToLoadDetermineFactorPlatform(subcategoryId, row.lineId);
    },
    [
      getValues,
      setValue,
      subcategoryId,
      subcategory.dimensions,
      resetFactorRelatedFields,
      resetFactorValueField,
      tryToLoadDetermineFactorPlatform,
    ]
  );

  const handleDeleteLine = useCallback(
    (lineId: LineId) => {
      // Remove line locally - will be deleted on form submit
      removeLine(subcategoryId, lineId);
    },
    [removeLine, subcategoryId]
  );

  const handleSetTotalEmission = useCallback(
    (total: number) => {
      const lines = getValues(`subcategories.${subcategoryId}.lines`) || {};
      // Filter to get only non-deleted lines
      const existingLineIds = Object.keys(lines).filter(
        (id) => lines[id] && !lines[id].isDeleted
      );

      if (existingLineIds.length > 0) {
        // Update the first existing line's manualTotalEmissions
        const targetId = existingLineIds[0];
        setValue(
          `subcategories.${subcategoryId}.lines.${targetId}.manualTotalEmissions`,
          total,
          { shouldDirty: true }
        );
      } else {
        // No existing lines, create a new one for manual mode
        const newLine = addLine(subcategoryId);
        setValue(
          `subcategories.${subcategoryId}.lines.${newLine.lineId}.manualTotalEmissions`,
          total,
          { shouldDirty: true }
        );
      }
    },
    [setValue, subcategoryId, getValues, addLine]
  );

  // Note: onSuccess is called even when no changes were made, allowing navigation without requiring edits
  const handleSetManualMode = useCallback(
    async (isManual: boolean) => {
      if (isTotalManualEmissionsModeLoading) return;

      startAction();
      setIsTotalManualEmissionsModeLoading(true);
      setIsLocalTotalManualEmissionsMode(isManual);

      // 1. Set the value in RHF with shouldDirty: true
      // This allows the global useEffect to detect that the user touched the mode
      setValue(
        `subcategories.${subcategoryId}.isTotalManualEmissionsMode`,
        isManual,
        { shouldDirty: true }
      );

      try {
        if (isManual) {
          const values = getValues();
          const subcategoryData = values.subcategories[subcategoryId];

          // Only submit if there are actual lines with changes to save
          const hasLinesToSave =
            subcategoryData?.lines &&
            Object.values(subcategoryData.lines).some(
              (line) => line && !line.isDeleted
            );

          if (hasLinesToSave) {
            const payload: EmissionCaptureFormValues = {
              subcategories: {
                [subcategoryId]: subcategoryData,
              },
            };

            // Submit returns void, errors are handled internally with snackbar
            // We wrap in try-catch to rethrow and handle at outer level
            try {
              await submit(payload);
            } catch (err) {
              // Log for debugging and rethrow to be handled by outer catch
              // eslint-disable-next-line no-console
              console.error("EmissionEditor submit error:", err);
              throw err;
            }
          }
        }

        await toggleManualMode({ activated: isManual });
      } catch (err) {
        // Revert local state on error (both submit and toggleManualMode)
        setIsLocalTotalManualEmissionsMode(null);
        setValue(
          `subcategories.${subcategoryId}.isTotalManualEmissionsMode`,
          !isManual,
          { shouldDirty: false }
        );
        // eslint-disable-next-line no-console
        console.error("EmissionEditor error:", err);
        // Display snackbar to alert user about the failure
        enqueueSnackbar("Ocurrió un error al cambiar el modo de emisiones.", {
          variant: "error",
        });
      } finally {
        setIsLocalTotalManualEmissionsMode(null);
        setIsTotalManualEmissionsModeLoading(false);
        endAction();
      }
    },
    [
      isTotalManualEmissionsModeLoading,
      toggleManualMode,
      getValues,
      submit,
      setValue,
      subcategoryId,
      startAction,
      endAction,
      enqueueSnackbar,
    ]
  );

  return {
    // Form state
    rows,
    isTotalManualEmissionsModeLoading,
    isTotalManualEmissionsMode,
    // Form actions
    handleAddLine,
    handleCellChange,
    handleFactorSourceChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  };
};
