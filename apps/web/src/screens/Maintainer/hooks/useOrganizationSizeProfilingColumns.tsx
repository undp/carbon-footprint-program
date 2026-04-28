import { useCallback, useMemo } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  CountryOrganizationSizeStatus,
  type GetAllAdminCountryOrganizationSizesResponse,
} from "@repo/types";
import { EditableTextCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export type OrganizationSizeFormRow = Pick<
  GetAllAdminCountryOrganizationSizesResponse[number],
  | "id"
  | "name"
  | "description"
  | "position"
  | "status"
  | "isInUse"
  | "impactedChildren"
>;

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
  onMoveUp: (row: OrganizationSizeFormRow) => void;
  onMoveDown: (row: OrganizationSizeFormRow) => void;
  moveDisabled: boolean;
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
  onMoveUp,
  onMoveDown,
  moveDisabled,
  restoreDisabled,
}: UseOrganizationSizeProfilingColumnsParams): GridColDef<OrganizationSizeFormRow>[] => {
  const activeRowsSorted = useMemo(
    () =>
      [...rows]
        .filter((r) => r.status === CountryOrganizationSizeStatus.ACTIVE)
        .sort((a, b) => a.position - b.position),
    [rows]
  );
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
        valueGetter: (_value, row: OrganizationSizeFormRow) =>
          row.status === CountryOrganizationSizeStatus.ACTIVE
            ? "Activo"
            : "Eliminado",
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

          const activeIdx = activeRowsSorted.findIndex(
            (r) => r.id === params.row.id
          );
          const isTemp = params.row.id.startsWith("temp_");
          const moveBlocked = isTemp || moveDisabled || anyEditing;
          const moveUpDisabled = moveBlocked || activeIdx <= 0;
          const moveDownDisabled =
            moveBlocked ||
            activeIdx === -1 ||
            activeIdx >= activeRowsSorted.length - 1;

          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onDelete={() => onDelete(params.row)}
              onMoveUp={() => onMoveUp(params.row)}
              onMoveDown={() => onMoveDown(params.row)}
              moveUpDisabled={moveUpDisabled}
              moveDownDisabled={moveDownDisabled}
              renderDeleteDialog={({ open, onCancel, onConfirm }) => (
                <DeleteWarningDialog
                  open={open}
                  entityLabel="tamaño"
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
      activeRowsSorted,
      onCellChange,
      onStartEditRow,
      editingRowId,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
      onRestore,
      onMoveUp,
      onMoveDown,
      moveDisabled,
      restoreDisabled,
    ]
  );
};
