import { FC } from "react";
import { Box, Typography, Button, Collapse } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { Subcategory } from "@repo/types";
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

interface EmissionEditorProps {
  subcategory: Subcategory;
  categoryPosition: number;
}

const EmissionEditorHeaderWrapper: FC<{
  subcategory: Subcategory;
  isTotalManualEmissionsMode: boolean;
  handleSetManualMode: (value: boolean) => void;
  handleSetTotalEmission: (value: number) => void;
}> = ({
  subcategory,
  isTotalManualEmissionsMode,
  handleSetManualMode,
  handleSetTotalEmission,
}) => {
  const totalEmission = useEmissionTotal(subcategory.id);

  return (
    <EmissionEditorHeader
      name={subcategory.name}
      description={subcategory.description}
      isTotalManualEmissionsMode={isTotalManualEmissionsMode}
      setIsTotalManualEmissionsMode={handleSetManualMode}
      totalEmission={totalEmission}
      setTotalEmission={handleSetTotalEmission}
    />
  );
};

export const EmissionEditor: FC<EmissionEditorProps> = ({
  subcategory,
  categoryPosition,
}) => {
  const { measurementUnits, rateMeasurementUnits, dimensions } =
    useEmissionEditorData({ subcategory });

  const {
    rows,
    isTotalManualEmissionsMode,
    handleAddLine,
    handleCellChange,
    handleFactorSourceChange,
    getLineValidation,
    handleDeleteLine,
    handleSetTotalEmission,
    handleSetManualMode,
  } = useEmissionEditorForm({
    subcategoryId: subcategory.id,
    emissionFactors: subcategory.emissionFactors,
    dimensions,
    rateMeasurementUnits: rateMeasurementUnits || [],
  });

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
    getLineValidation: getLineValidation,
    onDeleteLine: handleDeleteLine,
    onUpdateComment: openCommentDialog,
    onUploadFiles: () => {
      // TODO: Implement upload files functionality
    },
  });

  return (
    <Box className="bg-background flex flex-col gap-2 rounded-lg p-2">
      <EmissionEditorHeaderWrapper
        subcategory={subcategory}
        isTotalManualEmissionsMode={!!isTotalManualEmissionsMode}
        handleSetManualMode={handleSetManualMode}
        handleSetTotalEmission={handleSetTotalEmission}
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
