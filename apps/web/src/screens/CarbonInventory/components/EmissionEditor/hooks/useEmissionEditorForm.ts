import { useCallback, useMemo, useState, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useParams } from "@tanstack/react-router";
import { EmissionFactor, RateMeasurementUnit } from "@repo/types";
import { Routes } from "@/interfaces";
import {
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
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
  subcategoryId: string;
  initialLines: EmissionCaptureFormLine[];
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
  subcategoryId,
  initialLines,
  emissionFactors,
  rateMeasurementUnits,
}: UseEmissionEditorFormParams): UseEmssionEditorFormResults => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });

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

  const [isTotalManualEmissionsModeLoading, setIsTotalManualEmissionsModeLoading] =
    useState(false);

  const [isLocalTotalManualEmissionsMode, setIsLocalTotalManualEmissionsMode] =
    useState<boolean | null>(null);

  // Use local state for temp lines being added
  const [tempLines, setTempLines] = useState<EmissionCaptureFormLine[]>([]);

  useEffect(() => {
    setTempLines([]);
  }, [initialLines]);

  const { setValue, getValues, control } = useFormContext<EmissionCaptureFormValues>();

  const isDatabaseTotalManualEmissionsMode = useWatch({
    control: control,
    name: `subcategories.${subcategoryId}.isTotalManualEmissionsMode`,
  });

  const isTotalManualEmissionsMode = useMemo(() => {
    return isLocalTotalManualEmissionsMode || isDatabaseTotalManualEmissionsMode;
  }, [isLocalTotalManualEmissionsMode, isDatabaseTotalManualEmissionsMode]);

  const rows = useMemo(() => {
    return [...initialLines, ...tempLines];
  }, [initialLines, tempLines]);

  // Form actions
  const handleAddLine = useCallback(async () => {
    startAction();
    const tempId = `temp-${Date.now()}`;

    const newLine: EmissionCaptureFormLine = {
      id: tempId,
      lineId: tempId,
      subcategoryId,
      isManualTotalEmissions: false,
      dimensionValue1Id: null,
      dimensionValue2Id: null,
      measurementUnitId: null,
      quantity: null,
      factorValue: null,
      factorSource: null,
      baseFactorId: null,
      factorRateMeasurementUnitId: null,
      comment: null,
      manualTotalEmissions: null,
    };

    setTempLines((prev) => [...prev, newLine]);
    setValue(`subcategories.${subcategoryId}.lines.${tempId}`, newLine, {
      shouldDirty: true,
    });

    try {
      const result = await createLine();

      // RHF: update the line with the real ID
      const currentValues =
        (getValues(`subcategories.${subcategoryId}.lines.${tempId}`) as
          | EmissionCaptureFormLine
          | undefined) || newLine;

      // Remove temp line from form state and add with new ID
      const lines = getValues(`subcategories.${subcategoryId}.lines`);
      const newLines = { ...lines };
      delete newLines[tempId];
      newLines[result.id] = {
        ...currentValues,
        id: result.id,
        lineId: result.id,
      };

      setValue(`subcategories.${subcategoryId}.lines`, newLines, {
        shouldDirty: true,
      });

      // Local state: tempLines will be cleared when initialLines refreshes from DB
    } catch {
      setTempLines((prev) => prev.filter((l) => l.lineId !== tempId));
      const lines = getValues(`subcategories.${subcategoryId}.lines`);
      const newLines = { ...lines };
      delete newLines[tempId];
      setValue(`subcategories.${subcategoryId}.lines`, newLines);
    } finally {
      endAction();
    }
  }, [subcategoryId, createLine, setValue, getValues, startAction, endAction]);

  const handleCellChange = useCallback(
    (
      value: string | number | null,
      params: {
        field: string;
        row: EmissionCaptureFormLine;
      }
    ) => {
      const { field, row } = params;

      setValue(
        `subcategories.${subcategoryId}.lines.${row.lineId}.${field}`,
        value as never,
        { shouldDirty: true }
      );

      // resets derivados
      if (
        field === "dimensionValue1Id" ||
        field === "dimensionValue2Id" ||
        field === "measurementUnitId"
      ) {
        if (field === "dimensionValue1Id") {
          setValue(
            `subcategories.${subcategoryId}.lines.${row.lineId}.dimensionValue2Id`,
            null,
            { shouldDirty: true }
          );
        }

        setValue(
          `subcategories.${subcategoryId}.lines.${row.lineId}.factorSource`,
          null,
          { shouldDirty: true }
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${row.lineId}.baseFactorId`,
          null,
          { shouldDirty: true }
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${row.lineId}.factorValue`,
          null,
          { shouldDirty: true }
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${row.lineId}.factorRateMeasurementUnitId`,
          null,
          { shouldDirty: true }
        );
      }
    },
    [setValue, subcategoryId]
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
      // Optimistic delete from form state
      const lines = getValues(`subcategories.${subcategoryId}.lines`);
      const currentLines = { ...lines };
      const deletedLine = currentLines[lineId];
      delete currentLines[lineId];

      setValue(`subcategories.${subcategoryId}.lines`, currentLines, {
        shouldDirty: true,
      });

      // If it was a temp line, also remove from tempLines
      setTempLines((prev) => prev.filter((l) => l.lineId !== lineId));

      try {
        await deleteLine({ lineId });
      } catch {
        // Revert on error
        const linesAfterError = getValues(
          `subcategories.${subcategoryId}.lines`
        );
        const revertedLines = { ...linesAfterError };
        revertedLines[lineId] = deletedLine;
        setValue(`subcategories.${subcategoryId}.lines`, revertedLines);
        if (lineId.startsWith("temp-")) {
          setTempLines((prev) => [...prev, deletedLine]);
        }
      } finally {
        endAction();
      }
    },
    [deleteLine, subcategoryId, getValues, setValue, startAction, endAction]
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
        // eslint-disable-next-line no-console
        console.error("Error toggling manual mode:");
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
