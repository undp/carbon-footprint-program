import { FC } from "react";
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

interface EmissionEditorProps {
  subcategory: SubcategoryWithLines;
  categoryPosition: number;
}

export const EmissionEditor: FC<EmissionEditorProps> = ({
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
    subcategoryId: subcategory.id,
    initialLines: subcategory.lines,
    emissionFactors: subcategory.emissionFactors,
    rateMeasurementUnits: rateMeasurementUnits || [],
  });

  const totalEmission = useEmissionTotal(subcategory);

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
  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      <EmissionEditorHeader
        name={subcategory.name}
        description={subcategory.description}
        isTotalManualEmissionsMode={!!isTotalManualEmissionsMode}
        setIsTotalManualEmissionsMode={handleSetManualMode}
        isManualModeLoading={isTotalManualEmissionsModeLoading}
        totalEmission={totalEmission}
        setTotalEmission={handleSetTotalEmission}
      />

      <Collapse in={!isTotalManualEmissionsMode} collapsedSize={0}>
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
