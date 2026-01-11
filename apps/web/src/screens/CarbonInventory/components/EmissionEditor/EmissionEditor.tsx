import { FC } from "react";
import { Box, Typography, Button, Collapse } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { Subcategory } from "@repo/types";
import { EmissionEditorHeader } from "./EmissionEditorHeader";
import { EmissionEditorGrid } from "./EmissionEditorGrid";
import { EmissionEditorCommentDialog } from "./EmissionEditorCommentDialog";
import {
  useEmissionEditorData,
  useEmissionEditorActions,
  useEmissionEditorComment,
  useEmissionEditorColumns,
} from "./hooks";

interface EmissionEditorProps {
  subcategory: Subcategory;
  categoryPosition: number;
}

export const EmissionEditor: FC<EmissionEditorProps> = ({
  subcategory,
  categoryPosition,
}) => {
  // Hooks - all logic extracted
  const {
    rows,
    isTotalManualEmissionsMode,
    totalEmission,
    measurementUnits,
    rateMeasurementUnits,
    dimensions,
  } = useEmissionEditorData({ subcategory });

  const {
    handleAddLine,
    handleCellChange,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  } = useEmissionEditorActions({ subcategoryId: subcategory.id });

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
    onDeleteLine: handleDeleteLine,
    onUpdateComment: openCommentDialog,
    onUploadFiles: () => {
      // TODO: Implement upload files functionality
    },
  });

  // Only JSX - no logic
  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      <Collapse in={!isTotalManualEmissionsMode} collapsedSize={80}>
        <Box className="flex flex-col gap-2">
          {/* Header Section */}
          <EmissionEditorHeader
            name={subcategory.name}
            description={subcategory.description}
            isTotalManualEmissionsMode={isTotalManualEmissionsMode}
            setIsTotalManualEmissionsMode={handleSetManualMode}
            totalEmission={totalEmission}
            setTotalEmission={handleSetTotalEmission}
          />

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
