import { FC, useCallback, useMemo, useState } from "react";
import { Box, Typography, Button, Collapse, Alert } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { EmissionEditorHeader } from "./EmissionEditorHeader";
import { EmissionEditorGrid } from "./EmissionEditorGrid";
import { EmissionEditorCommentDialog } from "./EmissionEditorCommentDialog";
import { EmissionEditorFilesDialog } from "./EmissionEditorFilesDialog";
import {
  useEmissionEditorData,
  useEmissionEditorForm,
  useEmissionEditorComment,
  useEmissionEditorColumns,
  useEmissionSubcategoryTotal,
} from "./hooks";
import { SubcategoryWithLines } from "../../types/EmissionCaptureTypes";
import {
  buildFactorYearMismatchMessage,
  summarizeFactorYearMismatches,
} from "../../utils/factorYearMismatch";
import { UsageMode } from "@repo/types";
import { getColorPalette } from "@/utils/categoryColors";

interface EmissionEditorProps {
  inventoryUsageMode: UsageMode;
  subcategory: SubcategoryWithLines;
  categoryColor: string;
  inventoryId: string;
  /** The footprint year the factor recommendation is ranked against. */
  inventoryYear: number | null;
}

export const EmissionEditor: FC<EmissionEditorProps> = ({
  inventoryUsageMode,
  subcategory,
  categoryColor,
  inventoryId,
  inventoryYear,
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
    handleFactorSelectionChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  } = useEmissionEditorForm({
    subcategory,
    emissionFactors: subcategory.emissionFactors,
    rateMeasurementUnits: rateMeasurementUnits || [],
    inventoryYear,
  });

  const totalEmission = useEmissionSubcategoryTotal(subcategory.id);

  const { commentDialogProps, openCommentDialog } = useEmissionEditorComment({
    subcategoryId: subcategory.id,
  });

  const [filesDialog, setFilesDialog] = useState<{ lineId: string } | null>(
    null
  );

  const closeFilesDialog = useCallback(() => setFilesDialog(null), []);

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
    onFactorSelectionChange: handleFactorSelectionChange,
    onDeleteLine: handleDeleteLine,
    onUpdateComment: openCommentDialog,
    onUploadFiles: (lineId) => setFilesDialog({ lineId: lineId.toString() }),
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

  const handleManualModeLineUploadFiles = useCallback(() => {
    if (manualModeLine) {
      setFilesDialog({ lineId: manualModeLine.lineId });
    }
  }, [manualModeLine]);

  const { manualModeLinePendingFilesCount, manualModeLineLinkedFilesCount } =
    useMemo(() => {
      const removedFileIds = manualModeLine?.removedFileIds ?? [];
      const visibleFiles = (manualModeLine?.files ?? []).filter(
        (f) => !removedFileIds.includes(f.id)
      );
      const pending = visibleFiles.filter((f) => f.isPending).length;
      return {
        manualModeLinePendingFilesCount: pending,
        manualModeLineLinkedFilesCount: visibleFiles.length - pending,
      };
    }, [manualModeLine]);

  // Derived from the rows on every render, so it follows a reload, a single
  // factor edit and a change to the footprint year with no invalidation step —
  // and it is informational only: nothing here gates saving, navigating or
  // submitting, and no line is re-resolved because of it.
  const factorYearMismatch = useMemo(
    () => summarizeFactorYearMismatches(rows, inventoryYear),
    [rows, inventoryYear]
  );

  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      {factorYearMismatch && (
        <Alert severity="warning" variant="outlined">
          {buildFactorYearMismatchMessage(factorYearMismatch)}
        </Alert>
      )}
      <EmissionEditorHeader
        name={subcategory.name}
        description={subcategory.description}
        explanation={subcategory.explanation}
        icon={subcategory.icon}
        categoryColor={categoryColor}
        isTotalManualEmissionsModeAvailable={
          subcategory.isTotalManualEmissionsModeAvailable
        }
        isTotalManualEmissionsModeActive={isTotalManualEmissionsModeActive}
        setIsTotalManualEmissionsMode={handleSetManualMode}
        isManualModeLoading={isTotalManualEmissionsModeLoading}
        totalEmission={totalEmission}
        manualTotalEmissionValue={manualModeLine?.manualTotalEmissions ?? null}
        setTotalEmission={handleSetTotalEmission}
        hasManualModeLine={!!manualModeLine}
        manualModeLineHasComment={!!manualModeLine?.comment}
        onManualModeLineDelete={handleManualModeLineDelete}
        onManualModeLineComment={handleManualModeLineComment}
        onManualModeLineUploadFiles={handleManualModeLineUploadFiles}
        manualModeLinePendingFilesCount={manualModeLinePendingFilesCount}
        manualModeLineLinkedFilesCount={manualModeLineLinkedFilesCount}
        hasEmissionFactors={subcategory.emissionFactors.length > 0}
      />

      {/* unmountOnExit: in manual-total mode the grid must not stay mounted.
          Its dynamic row height (getRowHeight: "auto") drives a ResizeObserver
          that loops ("Maximum update depth exceeded" in GridVirtualScroller)
          when measuring rows inside the zero-height collapsed container. This
          also matches the design assumption in resetAfterSaveForSubcategory
          that the line cells unmount in total mode. */}
      <Collapse
        in={!isTotalManualEmissionsModeActive}
        collapsedSize={0}
        unmountOnExit
      >
        <Box className="flex flex-col gap-2">
          {/* Content Section */}
          <Box className="flex flex-col gap-2">
            {inventoryUsageMode === UsageMode.EXPERT && (
              <Typography
                variant="subtitle2"
                fontWeight="regular"
                sx={{ pl: 0.5 }}
              >
                Agrega las fuentes consideradas. Es opcional, pero nos ayuda a
                validar tu cálculo.
              </Typography>
            )}

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
      {filesDialog && (
        <EmissionEditorFilesDialog
          open
          onClose={closeFilesDialog}
          lineId={filesDialog.lineId}
          subcategoryId={subcategory.id}
          inventoryId={inventoryId}
        />
      )}
    </Box>
  );
};
