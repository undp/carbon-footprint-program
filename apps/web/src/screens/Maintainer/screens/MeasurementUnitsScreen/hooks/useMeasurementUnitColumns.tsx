import { useMemo, useCallback } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Magnitude } from "@repo/types";
import { MAGNITUDE_LABELS } from "@/config/vocab";
import {
  EditableTextCell,
  EditableNumberCell,
  MagnitudeSelectCell,
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
                !editing ? () => onStartEditRow(params.row.id) : undefined
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
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

          if (editing && isLocked) {
            return (
              <Tooltip title="No se puede cambiar la abreviatura porque la unidad ya tiene datos asociados.">
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
                    {params.row.abbreviation}
                  </Typography>
                </Box>
              </Tooltip>
            );
          }

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
                !editing ? () => onStartEditRow(params.row.id) : undefined
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
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

          if (editing && isLocked) {
            const label =
              MAGNITUDE_LABELS[params.row.magnitude as Magnitude] ??
              params.row.magnitude;
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

          return (
            <MagnitudeSelectCell
              formArrayName="measurementUnits"
              rowIndex={rowIndex}
              isEditing={editing}
              onChange={(value: Magnitude) =>
                onCellChange(rowIndex, "magnitude", value)
              }
              onClick={
                !editing && !protected_
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
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
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

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
                !editing && !protected_
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
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

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
        renderCell: (params: GridRenderCellParams<MeasurementUnitForm>) => {
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);
          const isLocked = params.row.referenceCount > 0;
          const disableDelete = protected_ || isLocked || editing;
          const deleteTooltipTitle = protected_
            ? "No se puede eliminar esta unidad de medida porque es una unidad base de esta magnitud."
            : isLocked
              ? "No se puede eliminar esta unidad de medida porque tiene datos asociados."
              : "Eliminar";

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
              deleteDisabled={disableDelete}
              deleteTooltipTitle={deleteTooltipTitle}
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
