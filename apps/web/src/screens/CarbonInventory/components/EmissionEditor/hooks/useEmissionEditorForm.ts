import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useParams } from "@tanstack/react-router";
import {
  EmissionFactor,
  EmissionFactorDimension,
  RateMeasurementUnit,
} from "@repo/types";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { Routes } from "@/interfaces";
import {
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
  LineValidationState,
} from "../../../types/EmissionCaptureTypes";
import {
  getCompatibleRateUnitId,
  getAvailableFactors,
  getBaseFactorId,
  getFactorData,
} from "../services/emissionFactorService";
import {
  canSelectFactorSource,
  canEditFactorValue,
  getDisabledReasonMessage,
} from "../services/fieldValidationService";
import { useCreateCarbonInventoryLine } from "@/api/query/carbonInventories/lines/useCreateCarbonInventoryLine";
import { useDeleteCarbonInventoryLine } from "@/api/query/carbonInventories/lines/useDeleteCarbonInventoryLine";
import { useToggleManualTotalEmissions } from "@/api/query/carbonInventories/subcategories/useToggleManualTotalEmissions";
interface UseEmissionEditorFormParams {
  subcategoryId: string;
  emissionFactors: EmissionFactor[];
  dimensions: EmissionFactorDimension[];
  rateMeasurementUnits: RateMeasurementUnit[];
}

interface UseEmssionEditorFormResults {
  rows: EmissionCaptureFormLine[];
  isTotalManualEmissionsMode: boolean;
  handleAddLine: () => Promise<void>;
  handleCellChange: (
    value: string | number | null,
    params: GridRenderCellParams<
      EmissionCaptureFormLine,
      string | number | null
    >
  ) => void;
  handleFactorSourceChange: (lineId: string, newFactorSource: string) => void;
  getLineValidation: (line: EmissionCaptureFormLine) => LineValidationState;
  handleDeleteLine: (lineId: string) => void;
  handleSetTotalEmission: (total: number) => void;
  handleSetManualMode: (isManual: boolean) => Promise<void>;
}

export const useEmissionEditorForm = ({
  subcategoryId,
  emissionFactors,
  dimensions,
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

  const { control, setValue } = useFormContext<EmissionCaptureFormValues>();

  const { append, remove, fields } = useFieldArray({
    control,
    name: `subcategories.${subcategoryId}.lines`,
  });

  const subcategoryLines = useWatch({
    control,
    name: `subcategories.${subcategoryId}.lines`,
  });

  const rows = useMemo(() => {
    return fields.map((field, index) => ({
      ...field,
      ...subcategoryLines?.[index],
    }));
  }, [fields, subcategoryLines]);

  const isTotalManualEmissionsMode = useWatch({
    control,
    name: `subcategories.${subcategoryId}.isTotalManualEmissionsMode`,
  });

  // Form actions
  const handleAddLine = useCallback(async () => {
    const tempId = `temp-${Date.now()}`;

    append({
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
    });

    try {
      const result = await createLine();

      const index = rows.findIndex((r) => r.lineId === tempId);
      if (index !== -1) {
        setValue(
          `subcategories.${subcategoryId}.lines.${index}.lineId`,
          result.id,
          { shouldDirty: true }
        );
      }
    } catch {
      const index = rows.findIndex((r) => r.lineId === tempId);
      if (index !== -1) remove(index);
    }
  }, [append, rows, remove, setValue, subcategoryId, createLine]);

  const handleCellChange = useCallback(
    (
      value: string | number | null,
      params: GridRenderCellParams<
        EmissionCaptureFormLine,
        string | number | null
      >
    ) => {
      const { field, row } = params;
      const index = rows.findIndex((r) => r.lineId === row.lineId);
      if (index === -1) return;

      setValue(
        `subcategories.${subcategoryId}.lines.${index}.${field}`,
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
            `subcategories.${subcategoryId}.lines.${index}.dimensionValue2Id`,
            null,
            { shouldDirty: true }
          );
        }

        setValue(
          `subcategories.${subcategoryId}.lines.${index}.factorSource`,
          null,
          { shouldDirty: true }
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${index}.baseFactorId`,
          null,
          { shouldDirty: true }
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${index}.factorValue`,
          null,
          { shouldDirty: true }
        );
        setValue(
          `subcategories.${subcategoryId}.lines.${index}.factorRateMeasurementUnitId`,
          null,
          { shouldDirty: true }
        );
      }
    },
    [rows, setValue, subcategoryId]
  );

  const handleFactorSourceChange = useCallback(
    (lineId: string, newFactorSource: string) => {
      const index = rows.findIndex((l) => l.lineId === lineId);
      if (index === -1) return;

      const line = rows[index];

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
        `subcategories.${subcategoryId}.lines.${index}.factorSource`,
        newFactorSource,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${index}.baseFactorId`,
        baseFactorId,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${index}.factorValue`,
        factorValue,
        { shouldDirty: true }
      );
      setValue(
        `subcategories.${subcategoryId}.lines.${index}.factorRateMeasurementUnitId`,
        factorRateMeasurementUnitId,
        { shouldDirty: true }
      );
    },
    [rows, emissionFactors, rateMeasurementUnits, setValue, subcategoryId]
  );

  const getLineValidation = useCallback(
    (line: EmissionCaptureFormLine): LineValidationState => {
      return {
        canSelectFactorSource: canSelectFactorSource(line, dimensions),
        canEditFactorValue: canEditFactorValue(line),
        factorSourceDisabledReason: getDisabledReasonMessage(
          "factorSource",
          line,
          dimensions
        ),
        factorValueDisabledReason: getDisabledReasonMessage(
          "factorValue",
          line,
          dimensions
        ),
      };
    },
    [dimensions]
  );

  const handleDeleteLine = useCallback(
    async (lineId: string) => {
      const index = rows.findIndex((r) => r.lineId === lineId);
      if (index === -1) return;

      const row = rows[index];
      remove(index);
      try {
        await deleteLine({ lineId: row.lineId });
      } catch {
        append(row);
      }
    },
    [rows, remove, append, deleteLine]
  );

  const handleSetTotalEmission = useCallback(
    (total: number) => {
      if (!isTotalManualEmissionsMode || rows.length === 0) return;

      setValue(
        `subcategories.${subcategoryId}.lines.0.manualTotalEmissions`,
        total,
        { shouldDirty: true }
      );
    },
    [isTotalManualEmissionsMode, rows, setValue, subcategoryId]
  );

  const handleSetManualMode = useCallback(
    async (isManual: boolean) => {
      try {
        await toggleManualMode({ activated: isManual });
        // Update local state only after successful API call
        setValue(
          `subcategories.${subcategoryId}.isTotalManualEmissionsMode`,
          isManual,
          {
            shouldDirty: true,
          }
        );
      } catch {
        // On error, don't update local state - the toggle will revert automatically
        // React Query will handle error notification
      }
    },
    [toggleManualMode, setValue, subcategoryId]
  );

  return {
    // Form state
    rows,
    isTotalManualEmissionsMode,
    // Form actions
    handleAddLine,
    handleCellChange,
    handleFactorSourceChange,
    getLineValidation,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  };
};
