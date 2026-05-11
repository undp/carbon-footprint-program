import { useCallback, useMemo } from "react";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useFormContext, useFormState } from "react-hook-form";
import { UsageMode } from "@repo/types";
import {
  EmissionCaptureFormLine,
  EmissionCaptureFormValues,
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
import {
  MeasurementUnit,
  MethodologyEmissionFactorDimension,
  MethodologySubcategory,
  RateMeasurementUnit,
} from "../../../types";

interface UseEmissionEditorColumnsParams {
  dimensions: MethodologyEmissionFactorDimension[];
  subcategory: MethodologySubcategory;
  measurementUnits: MeasurementUnit[] | undefined;
  rateMeasurementUnits: RateMeasurementUnit[] | undefined;
  categoryColor: string;
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
  inventoryUsageMode: UsageMode;
}

export const useEmissionEditorColumns = ({
  dimensions,
  subcategory,
  measurementUnits,
  rateMeasurementUnits,
  categoryColor,
  onCellChange,
  onFactorSourceChange,
  onDeleteLine,
  onUpdateComment,
  onUploadFiles,
  inventoryUsageMode,
  isManualModeLoading = false,
}: UseEmissionEditorColumnsParams): GridColDef<EmissionCaptureFormLine>[] => {
  const { control, getFieldState } =
    useFormContext<EmissionCaptureFormValues>();
  const formState = useFormState({
    control,
    name: `subcategories.${subcategory.id}.lines`,
  });

  const isCommentDirty = useCallback(
    (lineId: LineId): boolean =>
      getFieldState(
        `subcategories.${subcategory.id}.lines.${lineId}.comment`,
        formState
      ).isDirty,
    [getFieldState, formState, subcategory.id]
  );

  const displayedUnits = useMemo(() => {
    if (subcategory.allowedMeasurementUnitIds.length === 0)
      return measurementUnits || [];

    // Track which units have associated emission factors to show only those when in non-expert mode, but show all allowed units in expert mode
    const rateMeasurementUnitById = new Map(
      rateMeasurementUnits?.map((mu) => [mu.id, mu]) || []
    );
    const unitIdsWithEmissionFactors = new Set<string>();
    subcategory.emissionFactors.forEach((ef) => {
      const rateMeasurementUnit = rateMeasurementUnitById.get(
        ef.rateMeasurementUnitId
      );
      if (rateMeasurementUnit)
        unitIdsWithEmissionFactors.add(rateMeasurementUnit.denominatorUnit.id);
    });

    const allowedUnits =
      measurementUnits?.filter((mu) =>
        subcategory.allowedMeasurementUnitIds.includes(mu.id)
      ) || [];

    const filtered = allowedUnits.filter(
      (mu) =>
        inventoryUsageMode === UsageMode.EXPERT ||
        unitIdsWithEmissionFactors.has(mu.id)
    );
    return filtered;
  }, [
    inventoryUsageMode,
    measurementUnits,
    rateMeasurementUnits,
    subcategory.allowedMeasurementUnitIds,
    subcategory.emissionFactors,
  ]);

  return useMemo(() => {
    const firstDimension = dimensions.find((d) => d.position === 1);
    const secondDimension = dimensions.find((d) => d.position === 2);

    return [
      // First dimension column (if exists and has values)
      ...(firstDimension?.values.length
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

      // Second dimension column (if exists and has values)
      ...(secondDimension?.values.length
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
            measurementUnits={displayedUnits}
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
            onChange={(value) => onCellChange(value, params)}
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
              onChange={(value) => onCellChange(value, params)}
              disabled={isManualModeLoading}
            />
          );
        },
      },

      // Total emissions column
      {
        headerName: "Emisiones (tCO₂e)",
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
        renderCell: (params: GridRenderCellParams<EmissionCaptureFormLine>) => {
          const removedFileIds = params.row.removedFileIds ?? [];
          const visibleFiles = (params.row.files ?? []).filter(
            (f) => !removedFileIds.includes(f.id)
          );
          const pendingFilesCount = visibleFiles.filter(
            (f) => f.isPending
          ).length;
          const linkedFilesCount = visibleFiles.length - pendingFilesCount;
          const isCommentPending = Boolean(
            params.row.isNew || isCommentDirty(params.row.lineId)
          );
          return (
            <EmissionEditorActionsCell
              rowId={params.id}
              categoryColor={categoryColor}
              uploadFiles={() => onUploadFiles(params.id.toString())}
              updateComment={() =>
                onUpdateComment(params.id.toString(), params.row.comment || "")
              }
              deleteSource={() => onDeleteLine(params.id.toString())}
              disabled={isManualModeLoading}
              hasComment={Boolean(params.row.comment)}
              isCommentPending={isCommentPending}
              pendingFilesCount={pendingFilesCount}
              linkedFilesCount={linkedFilesCount}
            />
          );
        },
      },
    ];
  }, [
    dimensions,
    subcategory.emissionFactors,
    displayedUnits,
    rateMeasurementUnits,
    categoryColor,
    onCellChange,
    onFactorSourceChange,
    onDeleteLine,
    onUpdateComment,
    onUploadFiles,
    isManualModeLoading,
    subcategory.id,
    isCommentDirty,
  ]);
};
