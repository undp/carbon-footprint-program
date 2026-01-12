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
  getCompatibleRateUnitId,
  getAvailableFactors,
  getAvailableSources,
} from "../services/emissionFactorService";
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
                  onChange={(value) => onCellChange(value, params)}
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
                  onChange={(value) => onCellChange(value, params)}
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
            onChange={(value) => onCellChange(value, params)}
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
            onChange={(e) => onCellChange(e.target.value, params)}
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
              onChange={(e) => onCellChange(e.target.value, params)}
              disabled={!validation.canEditFactorValue}
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

          // 1. Get compatible rate unit
          const compatibleRateUnitId = getCompatibleRateUnitId(
            params.row.measurementUnitId,
            rateMeasurementUnits || []
          );

          // 2. Get available factors for this context (dimensions + rate unit)
          const availableFactors = getAvailableFactors(
            subcategory.emissionFactors,
            params.row.dimensionValue1Id,
            params.row.dimensionValue2Id,
            compatibleRateUnitId
          );

          // 3. Get unique sources
          const availableSources = getAvailableSources(availableFactors);

          return (
            <EmissionEditorFactorSourceCell
              availableSources={availableSources}
              value={params.value || null}
              rowId={params.id}
              disabled={!validation.canSelectFactorSource}
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
  ]);
};
