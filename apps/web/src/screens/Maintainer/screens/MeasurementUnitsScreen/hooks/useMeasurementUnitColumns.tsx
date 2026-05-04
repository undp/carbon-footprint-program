import { useMemo, useCallback } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Magnitude } from "@repo/types";
import { MAGNITUDE_LABELS } from "../constants.js";
import {
  EditableTextCell,
  EditableNumberCell,
  MagnitudeSelectCell,
} from "../../../components/cells";
import { ActionButtons } from "../../../components/ActionButtons";
import { ToggleCell } from "../../../components/ToggleCell";
import type { MeasurementUnitsFormRow } from "./useMeasurementUnitsForm.js";

interface UseMeasurementUnitColumnsParams {
  editingRowId: string | null;
  onCellChange: <K extends keyof MeasurementUnitsFormRow>(
    rowIndex: number,
    field: K,
    value: MeasurementUnitsFormRow[K]
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => Promise<boolean>;
  onCancelEditRow: () => void;
  onDelete: (row: MeasurementUnitsFormRow) => void;
  rows: MeasurementUnitsFormRow[];
}

const isProtectedRow = (row: MeasurementUnitsFormRow): boolean =>
  row.abbreviation === "kg" || (row.isBase && !row.id.startsWith("temp_"));

export const useMeasurementUnitColumns = ({
  editingRowId,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  rows,
}: UseMeasurementUnitColumnsParams): GridColDef<MeasurementUnitsFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );

  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<MeasurementUnitsFormRow>[]>(
    () => [
      {
        field: "magnitude",
        headerName: "Magnitud",
        minWidth: 180,
        flex: 0.5,
        renderCell: (params: GridRenderCellParams<MeasurementUnitsFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

          if (editing && isLocked) {
            const label =
              MAGNITUDE_LABELS[params.row.magnitude as Magnitude] ??
              params.row.magnitude;
            const tooltip = params.row.isBase
              ? "No se puede cambiar la magnitud porque es una unidad base."
              : "No se puede cambiar la magnitud porque la unidad ya tiene datos asociados.";
            return (
              <Tooltip title={tooltip}>
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
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
            />
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams<MeasurementUnitsFormRow>) => {
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
        minWidth: 140,
        flex: 0.5,
        renderCell: (params: GridRenderCellParams<MeasurementUnitsFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

          if (editing && isLocked) {
            const tooltip = params.row.isBase
              ? "No se puede cambiar la abreviatura porque es una unidad base."
              : "No se puede cambiar la abreviatura porque la unidad ya tiene datos asociados.";
            return (
              <Tooltip title={tooltip}>
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
        field: "baseFactor",
        headerName: "Factor base",
        minWidth: 130,
        flex: 0.5,
        type: "number",
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<MeasurementUnitsFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);
          const isLocked =
            protected_ || params.row.referenceCount > 0 || params.row.isBase;

          if (editing && isLocked) {
            const tooltip = params.row.isBase
              ? "El factor base de una unidad base siempre es 1."
              : "No se puede cambiar el factor base porque la unidad ya tiene datos asociados.";
            return (
              <Tooltip title={tooltip}>
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
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
            />
          );
        },
      },
      {
        field: "isBase",
        headerName: "¿Unidad base?",
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<MeasurementUnitsFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);
          const isLocked = protected_ || params.row.referenceCount > 0;

          if (editing && isLocked) {
            const tooltip = params.row.isBase
              ? "No se puede cambiar el indicador de unidad base porque es una unidad base."
              : "No se puede cambiar el indicador de unidad base porque la unidad ya tiene datos asociados.";
            return (
              <Tooltip title={tooltip}>
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
              onChange={(checked) => {
                onCellChange(rowIndex, "isBase", checked);
                if (checked) {
                  onCellChange(rowIndex, "baseFactor", 1);
                }
              }}
              disabled={!editing || isLocked}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        align: "center",
        headerAlign: "center",
        minWidth: 130,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<MeasurementUnitsFormRow>) => {
          const editing = isEditing(params.row.id);
          const protected_ = isProtectedRow(params.row);
          const disableDelete = protected_ || editing;
          const deleteTooltipTitle = protected_
            ? "No se puede eliminar esta unidad de medida porque es una unidad base de esta magnitud."
            : "Eliminar";

          return (
            <ActionButtons
              isActiveRow={editing}
              isEditing={editing}
              onStopEditCells={() => void onStopEditRow()}
              onCancelEdit={onCancelEditRow}
              // onEdit={
              //   !editing ? () => onStartEditRow(params.row.id) : undefined
              // }
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
