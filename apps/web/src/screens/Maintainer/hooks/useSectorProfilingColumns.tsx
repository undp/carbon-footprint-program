import { useCallback, useMemo } from "react";
import { RestoreOutlined } from "@mui/icons-material";
import { AdminActionButton } from "@/components/AdminActionButton";
import { StatusChip } from "@/components/StatusChip";
import { PROFILING_STATUS_CONFIG_MASCULINE } from "@/labels/status/profiling";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { z } from "zod";
import { CountrySectorStatus } from "@repo/types";
import { EditableTextCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export const SectorRowSchema = z.object({
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
  status: z.enum(CountrySectorStatus).nullable(),
  isInUse: z.boolean(),
  impactedChildren: z.object({
    activeSubsectors: z.number().int().nonnegative(),
    activeMainActivities: z.number().int().nonnegative(),
    organizationData: z.number().int().nonnegative(),
    subcategoryRecommendations: z.number().int().nonnegative(),
  }),
});

export type SectorFormRow = z.infer<typeof SectorRowSchema>;

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
          const isDeleted = params.row.status === CountrySectorStatus.DELETED;
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
          const isDeleted = params.row.status === CountrySectorStatus.DELETED;
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
          row.status === CountrySectorStatus.ACTIVE
            ? PROFILING_STATUS_CONFIG_MASCULINE.ACTIVE.label
            : row.status === CountrySectorStatus.DELETED
              ? PROFILING_STATUS_CONFIG_MASCULINE.DELETED.label
              : PROFILING_STATUS_CONFIG_MASCULINE.NEW.label,
        renderCell: ({ row }: GridRenderCellParams<SectorFormRow>) =>
          row.status === CountrySectorStatus.ACTIVE ? (
            <StatusChip config={PROFILING_STATUS_CONFIG_MASCULINE.ACTIVE} />
          ) : row.status === CountrySectorStatus.DELETED ? (
            <StatusChip config={PROFILING_STATUS_CONFIG_MASCULINE.DELETED} />
          ) : (
            <StatusChip config={PROFILING_STATUS_CONFIG_MASCULINE.NEW} />
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
        renderCell: (params: GridRenderCellParams<SectorFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted = params.row.status === CountrySectorStatus.DELETED;

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
