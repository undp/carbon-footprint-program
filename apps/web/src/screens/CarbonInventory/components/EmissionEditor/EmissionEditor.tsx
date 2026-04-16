import { FC, useCallback, useMemo } from "react";
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
  useEmissionSubcategoryTotal,
} from "./hooks";
import { SubcategoryWithLines } from "../../types/EmissionCaptureTypes";
import { UsageMode } from "@repo/types";
import { getColorPalette } from "@/utils/categoryColors";

interface EmissionEditorProps {
  inventoryUsageMode: UsageMode;
  subcategory: SubcategoryWithLines;
  categoryColor: string;
}

export const EmissionEditor: FC<EmissionEditorProps> = ({
  inventoryUsageMode,
  subcategory,
  categoryColor,
}) => {
  const { measurementUnits, rateMeasurementUnits, dimensions } =
    useEmissionEditorData({ subcategory });

  const {
    rows,
    manualModeLine,
    isTotalManualEmissionsModeLoading,
    isTotalManualEmissionsModeActive,
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

  const totalEmission = useEmissionSubcategoryTotal(subcategory.id);

  const { commentDialogProps, openCommentDialog } = useEmissionEditorComment({
    subcategoryId: subcategory.id,
  });

  const categoryColorPalette = useMemo(
    () => getColorPalette(categoryColor),
    [categoryColor]
  );

  const columns = useEmissionEditorColumns({
    dimensions,
    subcategory,
    measurementUnits,
    rateMeasurementUnits,
    categoryColor,
    inventoryUsageMode,
    onCellChange: handleCellChange,
    onFactorSourceChange: handleFactorSourceChange,
    onDeleteLine: handleDeleteLine,
    onUpdateComment: openCommentDialog,
    onUploadFiles: () => {
      // TODO: Implement upload files functionality
    },
  });

  // Handlers for manual mode line actions
  const handleManualModeLineComment = useCallback(() => {
    if (manualModeLine) {
      openCommentDialog(manualModeLine.lineId, manualModeLine.comment || "");
    }
  }, [manualModeLine, openCommentDialog]);

  const handleManualModeLineDelete = useCallback(() => {
    if (manualModeLine) {
      handleDeleteLine(manualModeLine.lineId);
    }
  }, [manualModeLine, handleDeleteLine]);

  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      <EmissionEditorHeader
        name={subcategory.name}
        description={subcategory.description}
        explanationSlug={subcategory.explanationSlug}
        icon={subcategory.icon}
        categoryColor={categoryColor}
        isTotalManualEmissionsModeAvailable={
          subcategory.isTotalManualEmissionsModeAvailable
        }
        isTotalManualEmissionsModeActive={isTotalManualEmissionsModeActive}
        setIsTotalManualEmissionsMode={handleSetManualMode}
        isManualModeLoading={isTotalManualEmissionsModeLoading}
        totalEmission={totalEmission}
        setTotalEmission={handleSetTotalEmission}
        hasManualModeLine={!!manualModeLine}
        manualModeLineHasComment={!!manualModeLine?.comment}
        onManualModeLineDelete={handleManualModeLineDelete}
        onManualModeLineComment={handleManualModeLineComment}
        hasEmissionFactors={subcategory.emissionFactors.length > 0}
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
                categoryColor={categoryColor}
                loading={isTotalManualEmissionsModeLoading}
              />
            )}
          </Box>

          {/* Footer Section */}
          <Box className="flex flex-row-reverse">
            <Button
              sx={{
                color: categoryColorPalette.dark,
                backgroundColor: categoryColorPalette.light,
              }}
              variant="text"
              onClick={handleAddLine}
              disabled={isTotalManualEmissionsModeLoading}
              startIcon={
                <AddRounded
                  sx={{
                    color: categoryColorPalette.dark,
                  }}
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
