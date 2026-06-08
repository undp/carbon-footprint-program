import { useCallback, useMemo } from "react";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { z } from "zod";
import { CountryOrganizationSizeStatus } from "@repo/types";
import { EditableTextCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { AdminActionButton } from "@/components/AdminActionButton";
import { StatusChip } from "@/components/StatusChip";
import {
  PROFILING_STATUS_CONFIG,
  resolveProfilingStatusKey,
} from "@/labels/chips/profiling";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export const OrganizationSizeRowSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(255, "El nombre no puede superar los 255 caracteres"),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción no puede superar los 2000 caracteres")
    .nullable(),
  position: z.number().int().positive(),
  status: z.enum(CountryOrganizationSizeStatus).nullable(),
  isInUse: z.boolean(),
  impactedChildren: z.object({
    organizationData: z.number().int().nonnegative(),
  }),
});

export type OrganizationSizeFormRow = z.infer<typeof OrganizationSizeRowSchema>;

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
        disableColumnMenu: true,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<OrganizationSizeFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status === CountryOrganizationSizeStatus.DELETED;
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
        disableColumnMenu: true,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<OrganizationSizeFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status === CountryOrganizationSizeStatus.DELETED;
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
              maxLength={2000}
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        disableColumnMenu: true,
        sortable: false,
        filterable: false,
        valueGetter: (_value, row: OrganizationSizeFormRow) =>
          PROFILING_STATUS_CONFIG[resolveProfilingStatusKey(row.status)].label,
        renderCell: ({
          row,
        }: GridRenderCellParams<OrganizationSizeFormRow>) => (
          <StatusChip
            config={
              PROFILING_STATUS_CONFIG[resolveProfilingStatusKey(row.status)]
            }
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 140,
        sortable: false,
        filterable: false,
        disableExport: true,
        headerAlign: "center",
        align: "center",
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<OrganizationSizeFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted =
            params.row.status === CountryOrganizationSizeStatus.DELETED;

          if (isDeleted) {
            return (
              <AdminActionButton
                icon={RestoreOutlined}
                tooltip="Restaurar"
                onClick={() => onRestore(params.row)}
                disabled={restoreDisabled || anyEditing}
              />
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
            <>
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
            </>
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
