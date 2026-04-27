import { useCallback, useMemo } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { CountryOrganizationSizeStatus } from "@repo/types";
import { EditableTextCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";

export interface OrganizationSizeFormRow {
  id: string;
  name: string;
  description: string | null;
  status: CountryOrganizationSizeStatus;
  isInUse: boolean;
}

interface UseOrganizationSizeProfilingColumnsParams {
  editingRowId: string | null;
  rows: OrganizationSizeFormRow[];
  onCellChange: (
    rowIndex: number,
    field: "name" | "description",
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: OrganizationSizeFormRow) => void;
  onRestore: (row: OrganizationSizeFormRow) => void;
  restoreDisabled: boolean;
}

export const useOrganizationSizeProfilingColumns = ({
  editingRowId,
  rows,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onRestore,
  restoreDisabled,
}: UseOrganizationSizeProfilingColumnsParams): GridColDef<OrganizationSizeFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<OrganizationSizeFormRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<OrganizationSizeFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status !== CountryOrganizationSizeStatus.ACTIVE;
          return (
            <EditableTextCell
              formArrayName="organizationSizes"
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                !isDeleted && !editing ? () => onStartEditRow(rowId) : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 2,
        minWidth: 250,
        renderCell: (params: GridRenderCellParams<OrganizationSizeFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status !== CountryOrganizationSizeStatus.ACTIVE;
          return (
            <EditableTextCell
              formArrayName="organizationSizes"
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
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: ({ row }: GridRenderCellParams<OrganizationSizeFormRow>) =>
          row.status === CountryOrganizationSizeStatus.ACTIVE ? (
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
        headerAlign: "center" as const,
        align: "center" as const,
        renderCell: (params: GridRenderCellParams<OrganizationSizeFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted =
            params.row.status !== CountryOrganizationSizeStatus.ACTIVE;

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
              deleteConfirmMessage="¿Estás seguro de que deseas eliminar este tamaño?"
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
