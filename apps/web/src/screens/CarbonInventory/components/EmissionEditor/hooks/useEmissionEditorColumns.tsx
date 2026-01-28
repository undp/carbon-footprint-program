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
  LineId,
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
  onFactorSourceChange: (lineId: LineId, factorSource: string) => void;
  onDeleteLine: (lineId: LineId) => void;
  onUpdateComment: (rowId: LineId, comment: string) => void;
  onUploadFiles: (rowId: LineId) => void;
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
              headerName: firstDimension
                ? firstDimension.name +
                  (!firstDimension?.isRequired ? " (opcional)" : "")
                : "Dimensión 1",
              minWidth: 157,
              flex: 1,
              cellClassName: "content-center max-h-[56px]",
              renderCell: (
                params: GridRenderCellParams<EmissionCaptureFormLine, string>
              ) => (
                <EmissionEditorDimensionCell
                  subcategoryId={subcategory.id}
                  lineId={params.row.lineId}
                  field="dimensionValue1Id"
                  dimension={firstDimension}
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
              headerName: secondDimension
                ? secondDimension.name +
                  (!secondDimension?.isRequired ? " (opcional)" : "")
                : "Dimensión 2",
              minWidth: 157,
              flex: 1,
              cellClassName: "content-center max-h-[56px]",
              renderCell: (
                params: GridRenderCellParams<EmissionCaptureFormLine, string>
              ) => (
                <EmissionEditorDimensionCell
                  subcategoryId={subcategory.id}
                  lineId={params.row.lineId}
                  field="dimensionValue2Id"
                  parentField="dimensionValue1Id"
                  dimension={secondDimension}
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
            subcategoryId={subcategory.id}
            lineId={params.row.lineId}
            measurementUnits={measurementUnits || []}
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
            subcategoryId={subcategory.id}
            lineId={params.row.lineId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onCellChange(e.target.value, params)
            }
            disabled={isManualModeLoading}
          />
        ),
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
          return (
            <EmissionEditorFactorSourceCell
              subcategoryId={subcategory.id}
              lineId={params.row.lineId}
              dimensions={dimensions}
              emissionFactors={subcategory.emissionFactors}
              rateMeasurementUnits={rateMeasurementUnits || []}
              disabled={isManualModeLoading}
              onChange={(value) =>
                onFactorSourceChange(params.row.lineId, value)
              }
            />
          );
        },
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
          return (
            <EmissionEditorFactorCell
              subcategoryId={subcategory.id}
              lineId={params.row.lineId}
              dimensions={dimensions}
              rateMeasurementUnits={rateMeasurementUnits || []}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onCellChange(e.target.value, params)
              }
              disabled={isManualModeLoading}
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
            subcategoryId={subcategory.id}
            lineId={params.row.lineId}
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
            hasComment={Boolean(params.row.comment)}
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
    onDeleteLine,
    onUpdateComment,
    onUploadFiles,
    isManualModeLoading,
    subcategory.id,
  ]);
};
