import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useParams } from "@tanstack/react-router";
import {
  EmissionFactor,
  EmissionFactorDimension,
  RateMeasurementUnit,
} from "@repo/types";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { round } from "lodash-es";
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
import { useSnackbar } from "notistack";
interface UseEmissionEditorFormParams {
  subcategoryId: string;
  emissionFactors: EmissionFactor[];
  dimensions: EmissionFactorDimension[];
  rateMeasurementUnits: RateMeasurementUnit[];
}

interface UseEmssionEditorFormResults {
  rows: EmissionCaptureFormLine[];
  isTotalManualEmissionsMode: boolean;
  totalEmission: number;
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
  handleSetManualMode: (isManual: boolean) => void;
}

export const useEmissionEditorForm = ({
  subcategoryId,
  emissionFactors,
  dimensions,
  rateMeasurementUnits,
}: UseEmissionEditorFormParams): UseEmssionEditorFormResults => {
  const { enqueueSnackbar } = useSnackbar();
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });

  // Form context
  const { control, getValues, setValue } =
    useFormContext<EmissionCaptureFormValues>();

  const { mutateAsync: createLine } = useCreateCarbonInventoryLine(
    inventoryId,
    subcategoryId
  );
  const { mutateAsync: deleteLine } = useDeleteCarbonInventoryLine(
    inventoryId,
    subcategoryId
  );

  // Watch form values for this subcategory
  const subcategoryData = useWatch({
    control,
    name: `subcategories.${subcategoryId}` as const,
  });

  // Field array for lines
  const { append, update, remove, insert } = useFieldArray({
    control,
    name: `subcategories.${subcategoryId}.lines` as const,
  });

  // Derived values from form
  const rows = useMemo(
    () => subcategoryData?.lines || [],
    [subcategoryData?.lines]
  );

  const isTotalManualEmissionsMode = false; // TODO: get from form when implemented

  const totalEmission = useMemo(() => {
    return rows.reduce((acc, row) => {
      const quantity = row.quantity || 0;
      const factorValue = row.factorValue || 0;
      return acc + round(quantity * factorValue, 2);
    }, 0);
  }, [rows]);

  const getLineContext = useCallback(
    (lineId: string) => {
      const currentLines =
        getValues(`subcategories.${subcategoryId}.lines` as const) || [];
      const index = currentLines.findIndex((line) => line.id === lineId);
      return {
        index,
        line: index !== -1 ? currentLines[index] : null,
      };
    },
    [getValues, subcategoryId]
  );

  // Form actions
  const handleAddLine = useCallback(async () => {
    const tempId = `temp-${Date.now()}`;
    const newRow: EmissionCaptureFormLine = {
      id: tempId,
      subcategoryId: subcategoryId,
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

    append(newRow);

    try {
      const result = await createLine();

      const { index, line } = getLineContext(tempId);

      if (index !== -1 && line) {
        update(index, {
          ...line,
          id: result.id,
        });
      }
    } catch (error) {
      // If failed, remove the temporary line
      const { index } = getLineContext(tempId);
      if (index !== -1) {
        remove(index);
      }
      // eslint-disable-next-line no-console
      console.error("Failed to create carbon inventory line", error);
      enqueueSnackbar("Error al crear la línea de emisión", {
        variant: "error",
      });
    }
  }, [
    subcategoryId,
    append,
    update,
    remove,
    createLine,
    enqueueSnackbar,
    getLineContext,
  ]);

  const handleCellChange = useCallback(
    (
      value: string | number | null,
      params: GridRenderCellParams<
        EmissionCaptureFormLine,
        string | number | null
      >
    ) => {
      const { field, id: lineId } = params;
      const { index, line } = getLineContext(lineId as string);

      if (index === -1 || !line) return;

      const updatedLine: EmissionCaptureFormLine = {
        ...line,
        [field]: value,
      };

      if (
        field === "dimensionValue1Id" ||
        field === "dimensionValue2Id" ||
        field === "measurementUnitId"
      ) {
        if (field === "dimensionValue1Id") {
          updatedLine.dimensionValue2Id = null;
        }

        updatedLine.factorSource = null;
        updatedLine.baseFactorId = null;
        updatedLine.factorValue = null;
        updatedLine.factorRateMeasurementUnitId = null;
      }

      // Update the line in the form
      update(index, updatedLine);

      // Update DataGrid UI immediately
      params.api.updateRows([updatedLine]);
    },
    [update, getLineContext]
  );

  const handleFactorSourceChange = useCallback(
    (lineId: string, newFactorSource: string) => {
      const { index, line } = getLineContext(lineId);
      if (index === -1 || !line) return;

      // 1. Get compatible rate unit for the current measurement unit
      const compatibleRateUnitId = getCompatibleRateUnitId(
        line.measurementUnitId,
        rateMeasurementUnits
      );

      // 2. Get factors available for the current context (dimensions + rate unit)
      const availableFactors = getAvailableFactors(
        emissionFactors,
        line.dimensionValue1Id,
        line.dimensionValue2Id,
        compatibleRateUnitId
      );

      // 3. Calculate baseFactorId and get factor data
      const baseFactorId = getBaseFactorId(availableFactors, newFactorSource);

      const { factorValue, factorRateMeasurementUnitId } = getFactorData(
        availableFactors,
        newFactorSource
      );

      // 4. Update the form
      const updatedLine: EmissionCaptureFormLine = {
        ...line,
        factorSource: newFactorSource,
        baseFactorId,
        factorValue,
        factorRateMeasurementUnitId,
      };

      setValue(
        `subcategories.${subcategoryId}.lines.${index}` as const,
        updatedLine,
        { shouldDirty: true }
      );
    },
    [
      subcategoryId,
      emissionFactors,
      rateMeasurementUnits,
      setValue,
      getLineContext,
    ]
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
      const { index, line } = getLineContext(lineId);

      if (index === -1 || !line) return;

      // Optimistic delete
      remove(index);

      try {
        await deleteLine({ lineId });
      } catch {
        // Restore line if failed
        insert(index, line);
        enqueueSnackbar("Error al eliminar la línea", { variant: "error" });
      }
    },
    [remove, getLineContext, deleteLine, insert, enqueueSnackbar]
  );

  const handleSetTotalEmission = useCallback((total: number) => {
    // TODO: Implementar lógica para actualizar manualTotalEmissions en la línea correspondiente
    // eslint-disable-next-line no-console
    console.warn("Set total emission not implemented yet", total);
  }, []);

  const handleSetManualMode = useCallback((isManual: boolean) => {
    // TODO: Implementar lógica para cambiar a modo manual
    // eslint-disable-next-line no-console
    console.warn("Manual mode not implemented yet", isManual);
  }, []);

  return {
    // Form state
    rows,
    isTotalManualEmissionsMode,
    totalEmission,
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
