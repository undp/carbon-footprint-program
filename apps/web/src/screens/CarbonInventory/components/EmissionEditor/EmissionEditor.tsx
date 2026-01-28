import { FC, useEffect } from "react";
import { Box, Typography, Button, Collapse } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { EmissionEditorHeader } from "./EmissionEditorHeader";
import { EmissionEditorGrid } from "./EmissionEditorGrid";
import { EmissionEditorCommentDialog } from "./EmissionEditorCommentDialog";
import {
  useEmissionEditorData,
  useEmissionEditorForm,
  useEmissionEditorComment,
  useEmissionEditorColumns,
  useEmissionTotal,
} from "./hooks";
import { SubcategoryWithLines } from "../../types/EmissionCaptureTypes";
import { useEmissionCaptureState } from "../../hooks/useEmissionCaptureState";

interface EmissionEditorProps {
  isTotalManualEmissionsModeAvailable: boolean;
  subcategory: SubcategoryWithLines;
  categoryPosition: number;
}

export const EmissionEditor: FC<EmissionEditorProps> = ({
  isTotalManualEmissionsModeAvailable,
  subcategory,
  categoryPosition,
}) => {
  const { measurementUnits, rateMeasurementUnits, dimensions } =
    useEmissionEditorData({ subcategory });

  const {
    rows,
    isTotalManualEmissionsModeLoading,
    isTotalManualEmissionsMode,
    handleAddLine,
    handleCellChange,
    handleFactorSourceChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  } = useEmissionEditorForm({
    subcategory,
    emissionFactors: subcategory.emissionFactors,
    rateMeasurementUnits: rateMeasurementUnits || [],
  });

  const totalEmission = useEmissionTotal(subcategory);
  const setSubcategoryTotal = useEmissionCaptureState(
    (state) => state.setSubcategoryTotal
  );

  // Sync subcategory total to the global state for category total calculation
  useEffect(() => {
    setSubcategoryTotal(subcategory.id, totalEmission);
  }, [
    subcategory.id,
    totalEmission,
    isTotalManualEmissionsMode,
    setSubcategoryTotal,
  ]);

  const { commentDialogProps, openCommentDialog } = useEmissionEditorComment({
    subcategoryId: subcategory.id,
  });

  const columns = useEmissionEditorColumns({
    dimensions,
    subcategory,
    measurementUnits,
    rateMeasurementUnits,
    categoryPosition,
    onCellChange: handleCellChange,
    onFactorSourceChange: handleFactorSourceChange,
    onDeleteLine: handleDeleteLine,
    onUpdateComment: openCommentDialog,
    onUploadFiles: () => {
      // TODO: Implement upload files functionality
    },
  });

  const subcategoryHasEmissionFactors = subcategory.emissionFactors.length > 0;

  const isTotalManualEmissionsModeActive =
    isTotalManualEmissionsMode || !subcategoryHasEmissionFactors;

  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      <EmissionEditorHeader
        name={subcategory.name}
        description={subcategory.description}
        isTotalManualEmissionsModeAvailable={
          isTotalManualEmissionsModeAvailable
        }
        subcategoryHasEmissionFactors={subcategoryHasEmissionFactors}
        isTotalManualEmissionsMode={isTotalManualEmissionsModeActive}
        setIsTotalManualEmissionsMode={handleSetManualMode}
        isManualModeLoading={isTotalManualEmissionsModeLoading}
        totalEmission={totalEmission}
        setTotalEmission={handleSetTotalEmission}
      />

      <Collapse in={!isTotalManualEmissionsModeActive} collapsedSize={0}>
        <Box className="flex flex-col gap-2">
          {/* Content Section */}
          <Box className="flex flex-col gap-2">
            <Typography variant="subtitle2" fontWeight="regular">
              Agrega las fuentes consideradas. Es opcional, pero nos ayuda a
              validar tu cálculo.
            </Typography>

            {measurementUnits && rateMeasurementUnits && (
              <EmissionEditorGrid
                rows={rows}
                columns={columns}
                categoryPosition={categoryPosition}
                loading={isTotalManualEmissionsModeLoading}
              />
            )}
          </Box>

          {/* Footer Section */}
          <Box className="flex flex-row-reverse">
            <Button
              sx={(theme) => ({
                color: theme.palette.category[categoryPosition].dark,
                backgroundColor: theme.palette.category[categoryPosition].light,
              })}
              variant="text"
              onClick={handleAddLine}
              disabled={isTotalManualEmissionsModeLoading}
              startIcon={
                <AddRounded
                  sx={(theme) => ({
                    color: theme.palette.category[categoryPosition].dark,
                  })}
                />
              }
            >
              Agregar Fuente
            </Button>
          </Box>
        </Box>
      </Collapse>

      <EmissionEditorCommentDialog {...commentDialogProps} />
    </Box>
  );
};
