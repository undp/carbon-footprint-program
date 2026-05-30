import { useCallback, useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useParams } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
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
  getAvailableSources,
} from "../services/emissionFactorService";
import { useToggleManualTotalEmissions } from "@/api/query/carbonInventories/subcategories/useToggleManualTotalEmissions";
import { useEmissionCaptureState } from "../../../hooks/useEmissionCaptureState";
import { useEmissionCaptureSubmit } from "../../../hooks/useEmissionCaptureSubmit";
import { useEmissionCaptureActions } from "../../../hooks/useEmissionCaptureActions";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";
import { MethodologyEmissionFactor, RateMeasurementUnit } from "../../../types";

interface UseEmissionEditorFormParams {
  subcategory: SubcategoryWithLines;
  emissionFactors: MethodologyEmissionFactor[];
  rateMeasurementUnits: RateMeasurementUnit[] | undefined;
}

interface UseEmssionEditorFormResults {
  rows: EmissionCaptureFormLine[];
  manualModeLine: EmissionCaptureFormLine | null;
  isTotalManualEmissionsModeLoading: boolean;
  isTotalManualEmissionsModeActive: boolean;
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
  handleSetTotalEmission: (total: number | null) => void;
  handleSetManualMode: (isManual: boolean) => Promise<void>;
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

  const [
    isLocalTotalManualEmissionsModeActive,
    setIsLocalTotalManualEmissionsModeActive,
  ] = useState<boolean | null>(null);

  // Get standard form context methods
  const formContext = useFormContext<EmissionCaptureFormValues>();
  const { setValue, getValues } = formContext;

  // Get imperative emission-capture actions (addLine, removeLine, ...) from
  // their dedicated context — react-hook-form 7.76's FormProvider no longer
  // forwards non-UseFormReturn props, so these can't ride on the form context.
  const { addLine, removeLine, resetAfterSaveForSubcategory } =
    useEmissionCaptureActions();

  // Watch lines from form state to get reactive updates
  const formLines = useWatch({
    control: formContext.control,
    name: `subcategories.${subcategoryId}.lines` as const,
  }) as Record<string, EmissionCaptureFormLine> | undefined;

  // Filter out deleted lines for display and convert to array.
  // The `line.lineId` guard discards partial line objects that RHF can
  // reconstruct during reconciliation: `reset(..., { keepDirtyValues: true })`
  // reapplies a still-dirty cell path (e.g. `lines.<id>.quantity`) onto a lines
  // record whose line was dropped by the manual-mode toggle, producing an
  // id-less object like `{ quantity: null }`. The grid's `getRowId` requires a
  // unique `lineId`, so such a row would crash the DataGrid.
  const rows = useMemo(() => {
    const linesRecord = formLines || {};
    return Object.values(linesRecord).filter(
      (line): line is EmissionCaptureFormLine =>
        line !== undefined && !!line.lineId && !line.isDeleted
    );
  }, [formLines]);

  const isTotalManualEmissionsModeActive = useMemo(() => {
    return (
      isLocalTotalManualEmissionsModeActive ??
      subcategory.isTotalManualEmissionsModeActive
    );
  }, [
    isLocalTotalManualEmissionsModeActive,
    subcategory.isTotalManualEmissionsModeActive,
  ]);

  // Get the first non-deleted line (used for manual mode actions)
  const manualModeLine = useMemo(() => {
    return isTotalManualEmissionsModeActive && rows.length > 0 ? rows[0] : null;
  }, [rows, isTotalManualEmissionsModeActive]);

  // Form actions - now local only, no API calls
  const handleAddLine = useCallback(() => {
    // Add line locally - will be persisted on form submit
    addLine(subcategoryId);
  }, [addLine, subcategoryId]);

  const resetFactorValueFields = useCallback(
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
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorRateMeasurementUnitId`,
        null,
        { shouldDirty: true }
      );
    },
    [setValue]
  );

  const resetFactorRelatedFields = useCallback(
    (subcategoryId: SubcategoryId, lineId: LineId) => {
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
        null,
        { shouldDirty: true }
      );
      resetFactorValueFields(subcategoryId, lineId);
    },
    [setValue, resetFactorValueFields]
  );

  const handleFactorSourceChange = useCallback(
    (lineId: string, newFactorSource: string) => {
      const line = getValues(
        `subcategories.${subcategoryId}.lines.${lineId}`
      ) as EmissionCaptureFormLine | undefined;
      if (!line) return;

      // Fast update factor source at the form
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
        newFactorSource,
        { shouldDirty: true }
      );

      if (CUSTOM_FACTOR_SOURCES.includes(newFactorSource)) {
        // Reset factor value and base factor, but keep the compatible rate unit
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
        const compatibleRateUnitId = getCompatibleRateUnitId(
          line.measurementUnitId,
          rateMeasurementUnits
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${lineId}.factorRateMeasurementUnitId`,
          compatibleRateUnitId,
          { shouldDirty: true }
        );
        return;
      }

      // Then, load the value of the selected factor source
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

      const sourceFilteredFactors = availableFactors.filter(
        (factor) => factor.source === newFactorSource
      );

      if (!sourceFilteredFactors.length) {
        // eslint-disable-next-line no-console
        console.warn(
          "There are no available factors for the selected parameters and source. Cannot auto-fill a factor value."
        );
        return;
      }

      if (sourceFilteredFactors.length > 1) {
        // eslint-disable-next-line no-console
        console.warn(
          "There are multiple available factors for the selected parameters and source. Cannot auto-fill a factor value."
        );
        return;
      }

      const factor = sourceFilteredFactors[0];
      const factorValue = Number(factor.value);

      if (!Number.isFinite(factorValue)) {
        // eslint-disable-next-line no-console
        console.warn(
          "The available factor has an invalid value. Cannot auto-fill a factor value."
        );
        return;
      }

      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.baseFactorId`,
        factor.originalEmissionFactorId ?? factor.id,
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

  const determineAutoLoadFactorSource = useCallback(
    (line: EmissionCaptureFormLine): string | null => {
      // 1. Get compatible rate unit
      const compatibleRateUnitId = getCompatibleRateUnitId(
        line.measurementUnitId,
        rateMeasurementUnits
      );

      // 2. Get available factors for this context (dimensions + rate unit)
      const availableFactors = getAvailableFactors(
        emissionFactors,
        line.dimensionValue1Id,
        line.dimensionValue2Id,
        compatibleRateUnitId
      );

      // 3. Get unique sources
      const factorSources = getAvailableSources(availableFactors);

      if (factorSources.length === 1) return factorSources[0];
      return null;
    },
    [emissionFactors, rateMeasurementUnits]
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
        const autoLoadedFactorSource = determineAutoLoadFactorSource(formLine);
        if (autoLoadedFactorSource)
          handleFactorSourceChange(lineId, autoLoadedFactorSource);
      }
    },
    [
      subcategory,
      getValues,
      determineAutoLoadFactorSource,
      handleFactorSourceChange,
    ]
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
        resetFactorValueFields(subcategoryId, row.lineId);

      // Try to fill a platform factor if possible
      tryToLoadDetermineFactorPlatform(subcategoryId, row.lineId);
    },
    [
      getValues,
      setValue,
      subcategoryId,
      subcategory.dimensions,
      resetFactorRelatedFields,
      resetFactorValueFields,
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
    (total: number | null) => {
      const lines = getValues(`subcategories.${subcategoryId}.lines`) || {};
      // Filter to get only valid, non-deleted lines. The `lineId` guard skips
      // id-less partial objects that RHF reconciliation can leave behind (see
      // the `rows` filter above): without it the total would be written onto a
      // partial that the display (`manualModeLine` = `rows[0]`) ignores and the
      // sync transform drops, so the entered value would silently disappear.
      const existingLineIds = Object.keys(lines).filter(
        (id) => lines[id] && lines[id].lineId && !lines[id].isDeleted
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
      setIsLocalTotalManualEmissionsModeActive(isManual);

      // 1. Set the value in RHF with shouldDirty: true
      // This allows the global useEffect to detect that the user touched the mode
      setValue(
        `subcategories.${subcategoryId}.isTotalManualEmissionsModeActive`,
        isManual,
        { shouldDirty: true }
      );

      try {
        // 2. If switching to manual mode, submit current form state to persist any pending changes
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

          // The submit above persisted this subcategory's lines but this submit
          // path has no resetAfterSave, so drop its temp/new and just-deleted
          // lines (scoped to the toggled subcategory) before the toggle refetch
          // repopulates them with their server ids — otherwise reconciliation
          // would duplicate them alongside the freshly created server rows.
          resetAfterSaveForSubcategory(subcategoryId);
        }

        await toggleManualMode({ activated: isManual });
      } catch (err) {
        // Revert local state on error (both submit and toggleManualMode)
        setIsLocalTotalManualEmissionsModeActive(null);
        setValue(
          `subcategories.${subcategoryId}.isTotalManualEmissionsModeActive`,
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
        setIsLocalTotalManualEmissionsModeActive(null);
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
      resetAfterSaveForSubcategory,
      subcategoryId,
      startAction,
      endAction,
      enqueueSnackbar,
    ]
  );

  return {
    // Form state
    rows,
    manualModeLine,
    isTotalManualEmissionsModeLoading,
    isTotalManualEmissionsModeActive,
    // Form actions
    handleAddLine,
    handleCellChange,
    handleFactorSourceChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  };
};
