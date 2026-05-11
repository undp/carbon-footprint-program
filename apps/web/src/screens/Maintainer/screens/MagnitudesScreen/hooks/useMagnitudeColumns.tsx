import { useMemo, useCallback } from "react";
import { Box, Chip, Tooltip, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { EditableTextCell } from "../../../components/cells";
import { ActionButtons } from "../../../components/ActionButtons";
import type { MagnitudesFormRow } from "./useMagnitudesForm.js";

interface UseMagnitudeColumnsParams {
  editingRowId: string | null;
  onCellChange: <K extends keyof MagnitudesFormRow>(
    rowIndex: number,
    field: K,
    value: MagnitudesFormRow[K]
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => Promise<boolean>;
  onCancelEditRow: () => void;
  onDelete: (row: MagnitudesFormRow) => void;
  rows: MagnitudesFormRow[];
}

const isNewRow = (id: string) => id.startsWith("temp_");

export const useMagnitudeColumns = ({
  editingRowId,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  rows,
}: UseMagnitudeColumnsParams): GridColDef<MagnitudesFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );

  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<MagnitudesFormRow>[]>(
    () => [
      {
        field: "code",
        headerName: "Código",
        minWidth: 180,
        flex: 0.5,
        renderCell: (params: GridRenderCellParams<MagnitudesFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isNew = isNewRow(params.row.id);

          if (!isNew) {
            return (
              <Tooltip title="El código no puede modificarse luego de la creación.">
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
                  <Typography variant="body2">{params.row.code}</Typography>
                </Box>
              </Tooltip>
            );
          }

          return (
            <EditableTextCell
              formArrayName="magnitudes"
              rowIndex={rowIndex}
              fieldName="code"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "code", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              placeholder="Ej: vehicles"
              autoFocus
            />
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<MagnitudesFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="magnitudes"
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
        field: "isSystem",
        headerName: "Origen",
        minWidth: 130,
        flex: 0.4,
        sortable: false,
        renderCell: (params: GridRenderCellParams<MagnitudesFormRow>) => (
          <Chip
            label={params.row.isSystem ? "Sistema" : "Usuario"}
            size="small"
            color={params.row.isSystem ? "info" : "success"}
          />
        ),
      },
      {
        field: "referenceCount",
        headerName: "Unidades asociadas",
        minWidth: 160,
        flex: 0.4,
        type: "number",
        headerAlign: "right",
        align: "right",
      },
      {
        field: "actions",
        headerName: "Acciones",
        align: "center",
        headerAlign: "center",
        minWidth: 140,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<MagnitudesFormRow>) => {
          const editing = isEditing(params.row.id);
          const isSystem = params.row.isSystem;
          const isReferenced = params.row.referenceCount > 0;

          const deleteDisabled = editing || isReferenced;
          const deleteTooltipTitle = isReferenced
            ? "Esta magnitud está en uso por unidades de medida. Elimina o reasigna esas unidades primero."
            : "Eliminar";

          return (
            <ActionButtons
              isActiveRow={editing}
              isEditing={editing}
              onStopEditCells={() => void onStopEditRow()}
              onCancelEdit={onCancelEditRow}
              onDelete={
                isSystem || editing ? undefined : () => onDelete(params.row)
              }
              deleteDisabled={deleteDisabled}
              deleteTooltipTitle={
                isSystem
                  ? "Las magnitudes del sistema no se pueden eliminar."
                  : deleteTooltipTitle
              }
              deleteConfirmMessage="¿Estás seguro de que deseas eliminar esta magnitud?"
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
