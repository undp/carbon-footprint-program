import { useCallback, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useParams } from "@tanstack/react-router";
import { EmissionFactor, RateMeasurementUnit } from "@repo/types";
import { Routes } from "@/interfaces";
import {
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
  SubcategoryWithLines,
} from "../../../types/EmissionCaptureTypes";
import {
  getCompatibleRateUnitId,
  getAvailableFactors,
  getBaseFactorId,
  getFactorData,
} from "../services/emissionFactorService";
import { useCreateCarbonInventoryLine } from "@/api/query/carbonInventories/lines/useCreateCarbonInventoryLine";
import { useDeleteCarbonInventoryLine } from "@/api/query/carbonInventories/lines/useDeleteCarbonInventoryLine";
import { useToggleManualTotalEmissions } from "@/api/query/carbonInventories/subcategories/useToggleManualTotalEmissions";
import { useEmissionCaptureState } from "../../../hooks/useEmissionCaptureState";

interface UseEmissionEditorFormParams {
  subcategory: SubcategoryWithLines;
  emissionFactors: EmissionFactor[];
  rateMeasurementUnits: RateMeasurementUnit[];
}

interface UseEmssionEditorFormResults {
  rows: EmissionCaptureFormLine[];
  isTotalManualEmissionsModeLoading: boolean;
  isTotalManualEmissionsMode: boolean;
  handleAddLine: () => Promise<void>;
  handleCellChange: (
    value: string | number | null,
    params: {
      field: string;
      row: EmissionCaptureFormLine;
    }
  ) => void;
  handleFactorSourceChange: (lineId: string, newFactorSource: string) => void;
  handleDeleteLine: (lineId: string) => void;
  handleSetTotalEmission: (total: number) => void;
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

  const { id: subcategoryId, lines: initialLines } = subcategory;

  const { mutateAsync: createLine } = useCreateCarbonInventoryLine(
    inventoryId,
    subcategoryId
  );
  const { mutateAsync: deleteLine } = useDeleteCarbonInventoryLine(
    inventoryId,
    subcategoryId
  );
  const { mutateAsync: toggleManualMode } = useToggleManualTotalEmissions(
    inventoryId,
    subcategoryId
  );

  const startAction = useEmissionCaptureState((state) => state.startAction);
  const endAction = useEmissionCaptureState((state) => state.endAction);

  const [
    isTotalManualEmissionsModeLoading,
    setIsTotalManualEmissionsModeLoading,
  ] = useState(false);

  const [isLocalTotalManualEmissionsMode, setIsLocalTotalManualEmissionsMode] =
    useState<boolean | null>(null);

  const { setValue, getValues } = useFormContext<EmissionCaptureFormValues>();

  const rows = initialLines;

  const isTotalManualEmissionsMode = useMemo(() => {
    return (
      isLocalTotalManualEmissionsMode ?? subcategory.isTotalManualEmissionsMode
    );
  }, [isLocalTotalManualEmissionsMode, subcategory.isTotalManualEmissionsMode]);

  // Form actions
  const handleAddLine = useCallback(async () => {
    startAction();

    try {
      await createLine();
    } catch {
      // Error handling is managed by the mutation or global error handler
    } finally {
      endAction();
    }
  }, [createLine, startAction, endAction]);

  const resetFactorRelatedFields = useCallback(
    (subcategoryId: string, lineId: string) => {
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
        !!factorSource && ["Factor Propio", "Otro"].includes(factorSource);

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

        if (!isOwnFactorSelected)
          resetFactorRelatedFields(subcategoryId, row.lineId);
      }

      if (field === "dimensionValue2Id") {
        const isRequired = subcategory.dimensions.find(
          ({ position }) => position === 2
        )?.isRequired;
        if (isRequired && !isOwnFactorSelected)
          resetFactorRelatedFields(subcategoryId, row.lineId);
      }

      if (field === "measurementUnitId") {
        resetFactorRelatedFields(subcategoryId, row.lineId);
      }
    },
    [
      getValues,
      setValue,
      subcategoryId,
      subcategory.dimensions,
      resetFactorRelatedFields,
    ]
  );

  const handleFactorSourceChange = useCallback(
    (lineId: string, newFactorSource: string) => {
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

      const baseFactorId = getBaseFactorId(availableFactors, newFactorSource);

      const { factorValue, factorRateMeasurementUnitId } = getFactorData(
        availableFactors,
        newFactorSource
      );

      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorSource`,
        newFactorSource,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.baseFactorId`,
        baseFactorId,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorValue`,
        factorValue,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${lineId}.factorRateMeasurementUnitId`,
        factorRateMeasurementUnitId,
        { shouldDirty: true }
      );
    },
    [emissionFactors, rateMeasurementUnits, setValue, subcategoryId, getValues]
  );

  const handleDeleteLine = useCallback(
    async (lineId: string) => {
      startAction();

      try {
        await deleteLine({ lineId });
      } catch {
        // Error handling is managed by the mutation or global error handler
      } finally {
        endAction();
      }
    },
    [deleteLine, startAction, endAction]
  );

  const handleSetTotalEmission = useCallback(
    (total: number) => {
      const lines = getValues(`subcategories.${subcategoryId}.lines`);
      const lineIds = Object.keys(lines || {});

      // In manual mode, we usually have only one line.
      // We use the first one available or a specific ID if known.
      const targetId = lineIds[0];

      setValue(
        `subcategories.${subcategoryId}.lines.${targetId}.manualTotalEmissions`,
        total,
        { shouldDirty: true }
      );
    },
    [setValue, subcategoryId, getValues]
  );

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
        await toggleManualMode({ activated: isManual });
      } catch {
        // Error is handled by the mutation's onError or the UI
      } finally {
        setIsLocalTotalManualEmissionsMode(null);
        setIsTotalManualEmissionsModeLoading(false);
        endAction();
      }
    },
    [
      isTotalManualEmissionsModeLoading,
      toggleManualMode,
      setValue,
      subcategoryId,
      startAction,
      endAction,
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
