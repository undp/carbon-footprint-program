import { useMemo, useCallback } from "react";
import { Button, ListSubheader, MenuItem, Select, Typography } from "@mui/material";
import { LocalFireDepartment as FlameIcon } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type {
  GetAllEmissionFactorsResponse,
  EmissionFactorForm,
} from "@repo/types";

import { EditableTextCell, EditableNumberCell, EmissionFactorSourceCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";

type EmissionFactor = GetAllEmissionFactorsResponse[number];

interface RateMeasurementUnit {
  id: string;
  name: string;
  abbreviation: string;
  denominatorUnitId: string;
}

interface SubcategoryOption {
  id: string;
  name: string;
  categoryName: string;
  measurementUnitIds: string[];
}

interface UseEmissionFactorColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: keyof EmissionFactorForm,
    value: unknown
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: EmissionFactorForm) => void;
  onOpenGEIBreakdown: (rowIndex: number) => void;
  rows: EmissionFactorForm[];
  subcategories: SubcategoryOption[];
  rateUnits: RateMeasurementUnit[];
}

export const useEmissionFactorColumns = ({
  editingRowId,
  viewOnly,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onOpenGEIBreakdown,
  rows,
  subcategories,
  rateUnits,
}: UseEmissionFactorColumnsParams): GridColDef<EmissionFactor>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<EmissionFactor>[]>(
    () => [
      {
        field: "subcategoryName",
        headerName: "Sub-categoría",
        flex: 0.2,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const formRow = rows[rowIndex];

          if (editing) {
            return (
              <Select
                size="small"
                fullWidth
                value={formRow?.subcategoryId ?? ""}
                onChange={(e) =>
                  onCellChange(rowIndex, "subcategoryId", e.target.value)
                }
              >
                {(() => {
                  const items: React.ReactNode[] = [];
                  let lastCategory = "";
                  for (const sc of subcategories) {
                    if (sc.categoryName !== lastCategory) {
                      lastCategory = sc.categoryName;
                      items.push(
                        <ListSubheader key={`header-${sc.categoryName}`}>
                          {sc.categoryName}
                        </ListSubheader>
                      );
                    }
                    items.push(
                      <MenuItem key={sc.id} value={sc.id}>
                        {sc.name}
                      </MenuItem>
                    );
                  }
                  return items;
                })()}
              </Select>
            );
          }

          const name =
            subcategories.find((sc) => sc.id === formRow?.subcategoryId)
              ?.name ?? params.row.subcategoryName;
          return (
            <Typography
              variant="body2"
              onClick={
                !viewOnly ? () => onStartEditRow(params.row.id) : undefined
              }
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: !viewOnly ? "pointer" : "default",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
                "&:hover": !viewOnly ? { backgroundColor: "grey.100" } : {},
              }}
            >
              {name}
            </Typography>
          );
        },
      },
      {
        field: "dimensionValue1Name",
        headerName: "Variable 1",
        flex: 0.15,
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="emissionFactors"
              rowIndex={rowIndex}
              fieldName="dimensionValue1Name"
              isEditing={editing}
              onChange={(value) =>
                onCellChange(rowIndex, "dimensionValue1Name", value)
              }
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "dimensionValue2Name",
        headerName: "Variable 2",
        flex: 0.15,
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="emissionFactors"
              rowIndex={rowIndex}
              fieldName="dimensionValue2Name"
              isEditing={editing}
              onChange={(value) =>
                onCellChange(rowIndex, "dimensionValue2Name", value)
              }
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "value",
        headerName: "Valor",
        width: 130,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableNumberCell
              formArrayName="emissionFactors"
              rowIndex={rowIndex}
              fieldName="value"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "value", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      {
        field: "rateMeasurementUnitName",
        headerName: "Unidad",
        flex: 0.12,
        minWidth: 120,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const formRow = rows[rowIndex];

          const selectedSubcategory = subcategories.find(
            (sc) => sc.id === formRow?.subcategoryId
          );
          const allowedUnitIds = selectedSubcategory?.measurementUnitIds ?? [];
          const filteredUnits =
            allowedUnitIds.length > 0
              ? rateUnits.filter((u) =>
                  allowedUnitIds.includes(u.denominatorUnitId)
                )
              : rateUnits;

          if (editing) {
            return (
              <Select
                size="small"
                fullWidth
                value={formRow?.rateMeasurementUnitId ?? ""}
                onChange={(e) =>
                  onCellChange(
                    rowIndex,
                    "rateMeasurementUnitId",
                    e.target.value
                  )
                }
              >
                {filteredUnits.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.abbreviation}
                  </MenuItem>
                ))}
              </Select>
            );
          }

          const unit = rateUnits.find(
            (u) => u.id === formRow?.rateMeasurementUnitId
          );
          return (
            <Typography
              variant="body2"
              onClick={
                !viewOnly ? () => onStartEditRow(params.row.id) : undefined
              }
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: !viewOnly ? "pointer" : "default",
                "&:hover": !viewOnly ? { backgroundColor: "grey.100" } : {},
              }}
            >
              {unit?.abbreviation ?? params.row.rateMeasurementUnitName}
            </Typography>
          );
        },
      },
      {
        field: "gasDetails",
        headerName: "Desglose GEI",
        width: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const formRow = rows[rowIndex];
          const gd = formRow?.gasDetails;
          const hasBreakdown =
            gd &&
            (gd.CO2_FOSSIL > 0 ||
              gd.CH4 > 0 ||
              gd.N2O > 0 ||
              gd.HFC > 0 ||
              gd.PFC > 0 ||
              gd.SF6 > 0 ||
              gd.NF3 > 0);
          const blockedByOtherEditing = editingRowId !== null && !editing;

          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<FlameIcon />}
              onClick={() => onOpenGEIBreakdown(rowIndex)}
              disabled={(viewOnly && !hasBreakdown) || blockedByOtherEditing}
              sx={{
                textTransform: "none",
                borderColor: hasBreakdown ? "success.main" : "grey.400",
                color: hasBreakdown ? "success.main" : "grey.600",
                "&:hover": {
                  borderColor: hasBreakdown ? "success.dark" : "grey.500",
                  backgroundColor: hasBreakdown ? undefined : "grey.50",
                },
              }}
            >
              {viewOnly
                ? hasBreakdown
                  ? "Ver"
                  : "—"
                : hasBreakdown
                  ? "Editar"
                  : "Agregar"}
            </Button>
          );
        },
      },
      {
        field: "source",
        headerName: "Fuente",
        flex: 0.15,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EmissionFactorSourceCell
              rowIndex={rowIndex}
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "source", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      ...(!viewOnly
        ? [
            {
              field: "actions",
              headerName: "Acciones",
              width: 100,
              sortable: false,
              filterable: false,
              headerAlign: "center" as const,
              align: "center" as const,
              renderCell: (params: GridRenderCellParams<EmissionFactor>) => {
                const anyEditing = editingRowId !== null;
                const rowIndex = getRowIndex(params.row.id);
                const formRow = rows[rowIndex];

                return (
                  <ActionButtons
                    isActiveRow={anyEditing && !isEditing(params.row.id)}
                    isEditing={isEditing(params.row.id)}
                    onStopEditCells={onStopEditRow}
                    onCancelEdit={onCancelEditRow}
                    onDelete={formRow ? () => onDelete(formRow) : undefined}
                    deleteConfirmMessage="¿Estás seguro de que deseas eliminar este factor de emisión?"
                  />
                );
              },
            },
          ]
        : []),
    ],
    [
      viewOnly,
      getRowIndex,
      isEditing,
      onCellChange,
      onStartEditRow,
      subcategories,
      rateUnits,
      onOpenGEIBreakdown,
      editingRowId,
      rows,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
    ]
  );
};
