import { useMemo, useCallback } from "react";
import { Box, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import { InfoOutlined, LockOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Magnitude } from "@repo/types";
import { MAGNITUDE_LABELS } from "@/config/vocab";
import {
  EditableTextCell,
  EditableNumberCell,
} from "../../../components/cells";
import { ActionButtons } from "../../../components/ActionButtons";
import { ToggleCell } from "../../../components/ToggleCell";
import type { MeasurementUnitForm } from "../types";

interface UseMeasurementUnitColumnsParams {
  editingRowId: string | null;
  onCellChange: <K extends keyof MeasurementUnitForm>(
    rowIndex: number,
    field: K,
    value: MeasurementUnitForm[K]
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => Promise<boolean>;
  onCancelEditRow: () => void;
  onDelete: (row: MeasurementUnitForm) => void;
  rows: MeasurementUnitForm[];
}

const isProtectedRow = (row: MeasurementUnitForm): boolean =>
  row.abbreviation === "kg" || row.isBase;

export const useMeasurementUnitColumns = ({
  editingRowId,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  rows,
}: UseMeasurementUnitColumnsParams): GridColDef<MeasurementUnitForm>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );

  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<MeasurementUnitForm>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="measurementUnits"
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                !editing && !isProtectedRow(params.row)
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      {
        field: "abbreviation",
        headerName: "Abreviatura",
        width: 140,
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="measurementUnits"
              rowIndex={rowIndex}
              fieldName="abbreviation"
              isEditing={editing}
              onChange={(value) =>
                onCellChange(rowIndex, "abbreviation", value)
              }
              onClick={
                !editing && !isProtectedRow(params.row)
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      {
        field: "magnitude",
        headerName: "Magnitud",
        width: 180,
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isLocked = params.row.referenceCount > 0;

          if (editing && !isLocked) {
            return (
              <Select
                size="small"
                fullWidth
                value={params.row.magnitude}
                onChange={(e) =>
                  onCellChange(
                    rowIndex,
                    "magnitude",
                    e.target.value as Magnitude
                  )
                }
                sx={{ backgroundColor: "white" }}
              >
                {Object.values(Magnitude).map((mag) => (
                  <MenuItem key={mag} value={mag}>
                    {MAGNITUDE_LABELS[mag]}
                  </MenuItem>
                ))}
              </Select>
            );
          }

          const magnitude = params.row.magnitude as Magnitude;
          const label = MAGNITUDE_LABELS[magnitude] ?? params.row.magnitude;

          if (editing && isLocked) {
            return (
              <Tooltip title="No se puede cambiar la magnitud porque la unidad ya tiene datos asociados.">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "text.disabled",
                    cursor: "default",
                  }}
                >
                  <LockOutlined sx={{ fontSize: 14 }} />
                  <Typography variant="body2">{label}</Typography>
                </Box>
              </Tooltip>
            );
          }

          return <Typography variant="body2">{label}</Typography>;
        },
      },
      {
        field: "baseFactor",
        headerName: "Factor base",
        width: 130,
        type: "number",
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isLocked = params.row.referenceCount > 0;

          if (editing && isLocked) {
            return (
              <Tooltip title="No se puede cambiar el factor base porque la unidad ya tiene datos asociados.">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "text.disabled",
                    cursor: "default",
                  }}
                >
                  <LockOutlined sx={{ fontSize: 14 }} />
                  <Typography variant="body2">
                    {params.row.baseFactor}
                  </Typography>
                </Box>
              </Tooltip>
            );
          }

          return (
            <EditableNumberCell
              formArrayName="measurementUnits"
              rowIndex={rowIndex}
              fieldName="baseFactor"
              isEditing={editing && !isLocked}
              onChange={(value) => onCellChange(rowIndex, "baseFactor", value)}
              onClick={
                !editing && !isProtectedRow(params.row)
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      {
        field: "isBase",
        headerName: "¿Unidad base?",
        width: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isLocked = params.row.referenceCount > 0;

          if (editing && isLocked) {
            return (
              <Tooltip title="No se puede cambiar el indicador de unidad base porque la unidad ya tiene datos asociados.">
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "text.disabled",
                    cursor: "default",
                  }}
                >
                  <LockOutlined sx={{ fontSize: 14 }} />
                  <Typography variant="body2">
                    {params.row.isBase ? "Sí" : "No"}
                  </Typography>
                </Box>
              </Tooltip>
            );
          }

          return (
            <ToggleCell
              value={params.row.isBase}
              onChange={(checked) => onCellChange(rowIndex, "isBase", checked)}
              disabled={!editing || isLocked}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 140,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);

          if (protected_) {
            const tooltip =
              params.row.abbreviation === "kg"
                ? 'La unidad "kg" es de sistema y no puede modificarse ni eliminarse.'
                : "Las unidades base de magnitud no pueden modificarse ni eliminarse.";

            return (
              <Tooltip title={tooltip}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                  }}
                >
                  <InfoOutlined
                    sx={{ fontSize: 20, color: "text.secondary" }}
                  />
                </Box>
              </Tooltip>
            );
          }

          return (
            <ActionButtons
              isActiveRow={editing}
              isEditing={editing}
              onStopEditCells={() => void onStopEditRow()}
              onCancelEdit={onCancelEditRow}
              onEdit={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              onDelete={!editing ? () => onDelete(params.row) : undefined}
              deleteConfirmMessage="¿Estás seguro de que deseas eliminar esta unidad de medida?"
            />
          );
        },
      },
    ],
    [
      getRowIndex,
      isEditing,
      onCellChange,
      onStartEditRow,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
    ]
  );
};
