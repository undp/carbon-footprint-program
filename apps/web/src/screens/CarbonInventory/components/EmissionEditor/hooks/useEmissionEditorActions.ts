import { useCallback } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { CarbonInventoryLine } from "@repo/types";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { EmissionCaptureFormValues } from "../../../types/EmissionCaptureTypes";

interface UseEmissionEditorActionsParams {
  subcategoryId: string;
}

export const useEmissionEditorActions = ({
  subcategoryId,
}: UseEmissionEditorActionsParams) => {
  // Form context
  const { control, setValue, getValues } =
    useFormContext<EmissionCaptureFormValues>();

  // Field array for lines
  const { append, update, remove } = useFieldArray({
    control,
    name: `subcategories.${subcategoryId}.lines` as const,
  });

  // Add new line to subcategory
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

  // Update a cell value
  const handleCellChange = useCallback(
    (
      value: string | number | null,
      params: GridRenderCellParams<CarbonInventoryLine, string | number | null>
    ) => {
      // Get current lines from form values
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

  // Delete a line
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

  // Set total emission (for manual mode)
  const handleSetTotalEmission = useCallback((total: number) => {
    // TODO: Implementar lógica para actualizar manualTotalEmissions en la línea correspondiente
    // eslint-disable-next-line no-console
    console.warn("Set total emission not implemented yet", total);
  }, []);

  // Toggle manual emissions mode
  const handleSetManualMode = useCallback((isManual: boolean) => {
    // TODO: Implementar lógica para cambiar a modo manual
    // eslint-disable-next-line no-console
    console.warn("Manual mode not implemented yet", isManual);
  }, []);

  return {
    handleAddLine,
    handleCellChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  };
};
