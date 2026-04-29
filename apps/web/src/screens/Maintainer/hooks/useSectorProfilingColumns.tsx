import { useCallback, useMemo } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  CountrySectorStatus,
  type GetAllAdminCountrySectorsResponse,
} from "@repo/types";
import { EditableTextCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export type SectorFormRow = Pick<
  GetAllAdminCountrySectorsResponse[number],
  "id" | "name" | "description" | "status" | "isInUse" | "impactedChildren"
>;

interface UseSectorProfilingColumnsParams {
  editingRowId: string | null;
  rows: SectorFormRow[];
  onCellChange: (
    rowIndex: number,
    field: "name" | "description",
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: SectorFormRow) => void;
  onRestore: (row: SectorFormRow) => void;
  restoreDisabled: boolean;
}

export const useSectorProfilingColumns = ({
  editingRowId,
  rows,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onRestore,
  restoreDisabled,
}: UseSectorProfilingColumnsParams): GridColDef<SectorFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<SectorFormRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<SectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted = params.row.status !== CountrySectorStatus.ACTIVE;
          return (
            <EditableTextCell
              formArrayName="sectors"
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                !isDeleted && !editing ? () => onStartEditRow(rowId) : undefined
              }
              truncateLines={1}
              maxLength={255}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 2,
        minWidth: 250,
        renderCell: (params: GridRenderCellParams<SectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted = params.row.status !== CountrySectorStatus.ACTIVE;
          return (
            <EditableTextCell
              formArrayName="sectors"
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                !isDeleted && !editing ? () => onStartEditRow(rowId) : undefined
              }
              multiline
              maxRows={3}
              truncateLines={3}
              placeholder="—"
              maxLength={2000}
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        valueGetter: (_value, row: SectorFormRow) =>
          row.status === CountrySectorStatus.ACTIVE ? "Activo" : "Eliminado",
        renderCell: ({ row }: GridRenderCellParams<SectorFormRow>) =>
          row.status === CountrySectorStatus.ACTIVE ? (
            <Chip label="Activo" size="small" color="success" />
          ) : (
            <Chip label="Eliminado" size="small" color="default" />
          ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 140,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<SectorFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted = params.row.status !== CountrySectorStatus.ACTIVE;

          if (isDeleted) {
            return (
              <Tooltip title="Restaurar">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onRestore(params.row)}
                    disabled={restoreDisabled || anyEditing}
                  >
                    <RestoreOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            );
          }

          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onDelete={() => onDelete(params.row)}
              renderDeleteDialog={({ open, onCancel, onConfirm }) => (
                <DeleteWarningDialog
                  open={open}
                  entityLabel="rubro"
                  impactedChildren={params.row.impactedChildren}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                />
              )}
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
      editingRowId,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
      onRestore,
      restoreDisabled,
    ]
  );
};
