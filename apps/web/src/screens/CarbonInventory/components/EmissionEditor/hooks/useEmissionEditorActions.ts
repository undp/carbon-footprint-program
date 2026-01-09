import { useCallback } from "react";
import { CarbonInventoryLine } from "@repo/types";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { useCarbonInventoryState } from "../../../hooks/useCarbonInventoryState";

interface UseEmissionEditorActionsParams {
  subcategoryId: string;
}

export const useEmissionEditorActions = ({
  subcategoryId,
}: UseEmissionEditorActionsParams) => {
  // Zustand store actions
  const addLine = useCarbonInventoryState((state) => state.addLine);
  const updateLine = useCarbonInventoryState((state) => state.updateLine);
  const deleteLine = useCarbonInventoryState((state) => state.deleteLine);
  const setTotalEmission = useCarbonInventoryState(
    (state) => state.setTotalEmission
  );
  const setManualEmissionsMode = useCarbonInventoryState(
    (state) => state.setManualEmissionsMode
  );

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

    addLine(subcategoryId, newRow);
  }, [subcategoryId, addLine]);

  // Update a cell value
  const handleCellChange = useCallback(
    (
      value: string,
      params: GridRenderCellParams<CarbonInventoryLine, string | number | null>
    ) => {
      // Update Zustand store with new dimension value
      updateLine(subcategoryId, params.id.toString(), {
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
    [subcategoryId, updateLine]
  );

  // Delete a line
  const handleDeleteLine = useCallback(
    (lineId: string) => {
      deleteLine(subcategoryId, lineId);
    },
    [subcategoryId, deleteLine]
  );

  // Set total emission (for manual mode)
  const handleSetTotalEmission = useCallback(
    (total: number) => {
      setTotalEmission(subcategoryId, total);
    },
    [subcategoryId, setTotalEmission]
  );

  // Toggle manual emissions mode
  const handleSetManualMode = useCallback(
    (isManual: boolean) => {
      setManualEmissionsMode(subcategoryId, isManual);
    },
    [subcategoryId, setManualEmissionsMode]
  );

  return {
    handleAddLine,
    handleCellChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  };
};
