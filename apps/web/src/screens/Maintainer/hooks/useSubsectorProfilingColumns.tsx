import { useCallback, useMemo } from "react";
import { Chip } from "@mui/material";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { z } from "zod";
import { CountrySubsectorStatus } from "@repo/types";
import { EditableTextCell, EditableSelectCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { ActionIconButton } from "@/components/ActionIconButton";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export const SubsectorRowSchema = z.object({
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
  countrySectorId: z.string().min(1, "El rubro es obligatorio"),
  status: z.enum(CountrySubsectorStatus).nullable(),
  isInUse: z.boolean(),
  impactedChildren: z.object({
    activeMainActivities: z.number().int().nonnegative(),
    organizationData: z.number().int().nonnegative(),
    subcategoryRecommendations: z.number().int().nonnegative(),
  }),
});

export type SubsectorFormRow = z.infer<typeof SubsectorRowSchema>;

interface UseSubsectorProfilingColumnsParams {
  editingRowId: string | null;
  rows: SubsectorFormRow[];
  sectorOptions: Array<{ id: string; name: string; disabled?: boolean }>;
  onCellChange: (
    rowIndex: number,
    field: "name" | "description" | "countrySectorId",
    value: string | null
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: SubsectorFormRow) => void;
  onRestore: (row: SubsectorFormRow) => void;
  restoreDisabled: boolean;
}

export const useSubsectorProfilingColumns = ({
  editingRowId,
  rows,
  sectorOptions,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onRestore,
  restoreDisabled,
}: UseSubsectorProfilingColumnsParams): GridColDef<SubsectorFormRow>[] => {
  const rowIndexById = useMemo(
    () => new Map(rows.map((row, index) => [row.id, index])),
    [rows]
  );
  const getRowIndex = useCallback(
    (rowId: string) => rowIndexById.get(rowId) ?? -1,
    [rowIndexById]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<SubsectorFormRow>[]>(
    () => [
      {
        field: "countrySectorId",
        headerName: "Rubro",
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: SubsectorFormRow) =>
          sectorOptions.find((o) => o.id === row.countrySectorId)?.name ?? "",
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status === CountrySubsectorStatus.DELETED;
          return (
            <EditableSelectCell
              formArrayName="subsectors"
              rowIndex={rowIndex}
              fieldName="countrySectorId"
              isEditing={editing}
              options={sectorOptions}
              onChange={(value) =>
                onCellChange(rowIndex, "countrySectorId", value)
              }
              onClick={
                !isDeleted && !editing ? () => onStartEditRow(rowId) : undefined
              }
            />
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status === CountrySubsectorStatus.DELETED;
          return (
            <EditableTextCell
              formArrayName="subsectors"
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
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status === CountrySubsectorStatus.DELETED;
          return (
            <EditableTextCell
              formArrayName="subsectors"
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
        valueGetter: (_value, row: SubsectorFormRow) =>
          row.status === CountrySubsectorStatus.ACTIVE
            ? "Activo"
            : row.status === CountrySubsectorStatus.DELETED
              ? "Eliminado"
              : "Nuevo",
        renderCell: ({ row }: GridRenderCellParams<SubsectorFormRow>) =>
          row.status === CountrySubsectorStatus.ACTIVE ? (
            <Chip label="Activo" size="small" color="success" />
          ) : row.status === CountrySubsectorStatus.DELETED ? (
            <Chip label="Eliminado" size="small" color="default" />
          ) : (
            <Chip label="Nuevo" size="small" color="info" />
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
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted =
            params.row.status === CountrySubsectorStatus.DELETED;

          if (isDeleted) {
            return (
              <ActionIconButton
                icon={RestoreOutlined}
                tooltip="Restaurar"
                ariaLabel="Restaurar subrubro"
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
                  entityLabel="subrubro"
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
      sectorOptions,
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
