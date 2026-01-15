import { useMemo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  EmissionFactorDimension,
  MeasurementUnit,
  RateMeasurementUnit,
  Subcategory,
} from "@repo/types";
import {
  EmissionCaptureFormLine,
  LineValidationState,
} from "../../../types/EmissionCaptureTypes";
import {
  EmissionEditorDimensionCell,
  EmissionEditorMeasurementUnitCell,
  EmissionEditorQuantityCell,
  EmissionEditorFactorCell,
  EmissionEditorFactorSourceCell,
  EmissionEditorEmissionsCell,
  EmissionEditorActionsCell,
} from "../cells";

interface UseEmissionEditorColumnsParams {
  dimensions: EmissionFactorDimension[];
  subcategory: Subcategory;
  measurementUnits: MeasurementUnit[] | undefined;
  rateMeasurementUnits: RateMeasurementUnit[] | undefined;
  categoryPosition: number;
  onCellChange: (
    value: string | number | null,
    params: GridRenderCellParams<
      EmissionCaptureFormLine,
      string | number | null
    >
  ) => void;
  onFactorSourceChange: (lineId: string, factorSource: string) => void;
  getLineValidation: (line: EmissionCaptureFormLine) => LineValidationState;
  onDeleteLine: (lineId: string) => void;
  onUpdateComment: (rowId: string, comment: string) => void;
  onUploadFiles: (rowId: string) => void;
  isManualModeLoading?: boolean;
}

export const useEmissionEditorColumns = ({
  dimensions,
  subcategory,
  measurementUnits,
  rateMeasurementUnits,
  categoryPosition,
  onCellChange,
  onFactorSourceChange,
  getLineValidation,
  onDeleteLine,
  onUpdateComment,
  onUploadFiles,
  isManualModeLoading = false,
}: UseEmissionEditorColumnsParams): GridColDef<EmissionCaptureFormLine>[] => {
  return useMemo(() => {
    const firstDimension = dimensions.find((d) => d.position === 1);
    const secondDimension = dimensions.find((d) => d.position === 2);

    return [
      // First dimension column (if exists)
      ...(firstDimension
        ? [
            {
              field: `dimensionValue1Id`,
              headerName: firstDimension?.name || "Dimensión 1",
              minWidth: 157,
              flex: 1,
              cellClassName: "content-center max-h-[56px]",
              renderCell: (
                params: GridRenderCellParams<EmissionCaptureFormLine, string>
              ) => (
                <EmissionEditorDimensionCell
                  dimension={firstDimension}
                  value={params.value || null}
                  onChange={(value: string) => onCellChange(value, params)}
                  disabled={isManualModeLoading}
                />
              ),
            },
          ]
        : []),

      // Second dimension column (if exists)
      ...(secondDimension
        ? [
            {
              field: `dimensionValue2Id`,
              headerName: secondDimension?.name || "Dimensión 2",
              minWidth: 157,
              flex: 1,
              cellClassName: "content-center max-h-[56px]",
              renderCell: (
                params: GridRenderCellParams<EmissionCaptureFormLine, string>
              ) => (
                <EmissionEditorDimensionCell
                  dimension={secondDimension}
                  value={params.value || null}
                  parentValue={params.row.dimensionValue1Id}
                  onChange={(value: string) => onCellChange(value, params)}
                  disabled={isManualModeLoading}
                />
              ),
            },
          ]
        : []),

      // Measurement unit column
      {
        headerName: "Unidad",
        field: "measurementUnitId",
        headerAlign: "center",
        minWidth: 110,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<EmissionCaptureFormLine, string>
        ) => (
          <EmissionEditorMeasurementUnitCell
            measurementUnits={measurementUnits || []}
            value={params.value || null}
            rowId={params.id}
            onChange={(value: string) => onCellChange(value, params)}
            disabled={isManualModeLoading}
          />
        ),
      },
      // Quantity column
      {
        headerName: "Cantidad",
        field: "quantity",
        headerAlign: "center",
        minWidth: 110,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<EmissionCaptureFormLine, number | null>
        ) => (
          <EmissionEditorQuantityCell
            value={params.value ?? null}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onCellChange(e.target.value, params)
            }
            disabled={isManualModeLoading}
          />
        ),
      },

      // Factor column
      {
        headerName: "Factor",
        field: "factorValue",
        headerAlign: "center",
        align: "right",
        minWidth: 130,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<EmissionCaptureFormLine, number | null>
        ) => {
          const validation = getLineValidation(params.row);
          return (
            <EmissionEditorFactorCell
              value={params.value ?? null}
              factorSource={params.row.factorSource}
              measurementUnitId={params.row.measurementUnitId}
              rateMeasurementUnits={rateMeasurementUnits || []}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onCellChange(e.target.value, params)
              }
              disabled={isManualModeLoading || !validation.canEditFactorValue}
              disabledReason={validation.factorValueDisabledReason}
            />
          );
        },
      },

      // Factor source column
      {
        headerName: "Fuente factor",
        field: "factorSource",
        minWidth: 157,
        flex: 1,
        cellClassName: "content-center max-h-[56px]",
        renderCell: (
          params: GridRenderCellParams<EmissionCaptureFormLine, string>
        ) => {
          const validation = getLineValidation(params.row);

          return (
            <EmissionEditorFactorSourceCell
              emissionFactors={subcategory.emissionFactors}
              rateMeasurementUnits={rateMeasurementUnits || []}
              measurementUnitId={params.row.measurementUnitId}
              dimensionValue1Id={params.row.dimensionValue1Id}
              dimensionValue2Id={params.row.dimensionValue2Id}
              value={params.value || null}
              rowId={params.id}
              disabled={
                isManualModeLoading || !validation.canSelectFactorSource
              }
              disabledReason={validation.factorSourceDisabledReason}
              onChange={(value) =>
                onFactorSourceChange(params.id.toString(), value)
              }
            />
          );
        },
      },

      // Total emissions column
      {
        headerName: "Emisiones tCO₂e",
        field: "totalEmissions",
        headerAlign: "center",
        cellClassName: "content-center",
        minWidth: 157,
        flex: 1,
        align: "right",
        renderCell: (
          params: GridRenderCellParams<EmissionCaptureFormLine, number | null>
        ) => (
          <EmissionEditorEmissionsCell
            quantity={params.row.quantity}
            factorValue={params.row.factorValue}
          />
        ),
      },

      // Actions column
      {
        field: "actions",
        headerName: "Acciones",
        headerAlign: "center",
        minWidth: 157,
        flex: 1,
        cellClassName: "content-center",
        renderCell: (params: GridRenderCellParams<EmissionCaptureFormLine>) => (
          <EmissionEditorActionsCell
            rowId={params.id}
            categoryPosition={categoryPosition}
            uploadFiles={() => onUploadFiles(params.id.toString())}
            updateComment={() =>
              onUpdateComment(params.id.toString(), params.row.comment || "")
            }
            deleteSource={() => onDeleteLine(params.id.toString())}
            disabled={isManualModeLoading}
          />
        ),
      },
    ];
  }, [
    dimensions,
    subcategory.emissionFactors,
    measurementUnits,
    rateMeasurementUnits,
    categoryPosition,
    onCellChange,
    onFactorSourceChange,
    getLineValidation,
    onDeleteLine,
    onUpdateComment,
    onUploadFiles,
    isManualModeLoading,
  ]);
};
