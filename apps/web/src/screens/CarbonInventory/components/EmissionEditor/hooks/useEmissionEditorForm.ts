import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { CarbonInventoryLine } from "@repo/types";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { round } from "lodash-es";
import { EmissionCaptureFormValues } from "../../../types/EmissionCaptureTypes";

interface UseEmissionEditorFormParams {
  subcategoryId: string;
}

interface UseEmssionEditorFormResults {
  rows: CarbonInventoryLine[];
  isTotalManualEmissionsMode: boolean;
  totalEmission: number;
  handleAddLine: () => void;
  handleCellChange: (
    value: string | number | null,
    params: GridRenderCellParams<CarbonInventoryLine, string | number | null>
  ) => void;
  handleDeleteLine: (lineId: string) => void;
  handleSetTotalEmission: (total: number) => void;
  handleSetManualMode: (isManual: boolean) => void;
}

export const useEmissionEditorForm = ({
  subcategoryId,
}: UseEmissionEditorFormParams): UseEmssionEditorFormResults => {
  // Form context
  const { control, getValues } = useFormContext<EmissionCaptureFormValues>();

  // Watch form values for this subcategory
  const subcategoryData = useWatch({
    control,
    name: `subcategories.${subcategoryId}` as const,
  });

  // Field array for lines
  const { append, update, remove } = useFieldArray({
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

  // Form actions
  const handleAddLine = useCallback(() => {
    const newRow: CarbonInventoryLine = {
      id: (Date.now() + Math.random()).toString(),
      subcategoryId: subcategoryId,
      isManualTotalEmissions: false,
      dimensionValue1Id: null,
      dimensionValue2Id: null,
      measurementUnitId: null,
      quantity: null,
      factorValue: null,
      factorSource: null,
      factorRateMeasurementUnitId: null,
      comment: null,
      manualTotalEmissions: null,
    };

    append(newRow);
  }, [subcategoryId, append]);

  const handleCellChange = useCallback(
    (
      value: string | number | null,
      params: GridRenderCellParams<CarbonInventoryLine, string | number | null>
    ) => {
      const currentLines = getValues(
        `subcategories.${subcategoryId}.lines` as const
      );

      if (!currentLines) return;

      const lineIndex = currentLines.findIndex(
        (line) => line.id === params.id.toString()
      );

      if (lineIndex === -1) return;

      // Update the line in the form
      update(lineIndex, {
        ...currentLines[lineIndex],
        [params.field]: value,
      });

      // Update DataGrid UI to reflect the change immediately
      params.api.updateRows([
        {
          id: params.id,
          [params.field]: value,
        },
      ]);
    },
    [subcategoryId, getValues, update]
  );

  const handleDeleteLine = useCallback(
    (lineId: string) => {
      const currentLines = getValues(
        `subcategories.${subcategoryId}.lines` as const
      );

      if (!currentLines) return;

      const lineIndex = currentLines.findIndex((line) => line.id === lineId);

      if (lineIndex === -1) return;

      remove(lineIndex);
    },
    [subcategoryId, getValues, remove]
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
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  };
};
