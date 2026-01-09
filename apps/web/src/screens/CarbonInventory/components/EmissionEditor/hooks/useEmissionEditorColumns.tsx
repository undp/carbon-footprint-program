import { useMemo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  CarbonInventoryLine,
  EmissionFactorDimension,
  MeasurementUnit,
  RateMeasurementUnit,
  Subcategory,
} from "@repo/types";
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
    value: string,
    params: GridRenderCellParams<CarbonInventoryLine, string | number | null>
  ) => void;
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
  onDeleteLine,
  onUpdateComment,
  onUploadFiles,
}: UseEmissionEditorColumnsParams): GridColDef<CarbonInventoryLine>[] => {
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
                params: GridRenderCellParams<CarbonInventoryLine, string>
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
                params: GridRenderCellParams<CarbonInventoryLine, string>
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
          params: GridRenderCellParams<CarbonInventoryLine, string>
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
          params: GridRenderCellParams<CarbonInventoryLine, number | null>
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
          params: GridRenderCellParams<CarbonInventoryLine, number | null>
        ) => (
          <EmissionEditorFactorCell
            value={params.value ?? null}
            factorSource={params.row.factorSource}
            measurementUnitId={params.row.measurementUnitId}
            rateMeasurementUnits={rateMeasurementUnits || []}
            onChange={(e) => onCellChange(e.target.value, params)}
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
          params: GridRenderCellParams<CarbonInventoryLine, string>
        ) => (
          <EmissionEditorFactorSourceCell
            emissionFactors={subcategory.emissionFactors}
            value={params.value || null}
            rowId={params.id}
            onChange={(value) => onCellChange(value, params)}
          />
        ),
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
          params: GridRenderCellParams<CarbonInventoryLine, number | null>
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
        renderCell: (params: GridRenderCellParams<CarbonInventoryLine>) => (
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
    onDeleteLine,
    onUpdateComment,
    onUploadFiles,
  ]);
};
