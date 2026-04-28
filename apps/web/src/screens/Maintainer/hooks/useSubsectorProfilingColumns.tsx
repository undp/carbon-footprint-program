import { useCallback, useMemo } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  CountrySubsectorStatus,
  type GetAllAdminCountrySubsectorsResponse,
} from "@repo/types";
import { EditableTextCell, EditableSelectCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export type SubsectorFormRow = Pick<
  GetAllAdminCountrySubsectorsResponse[number],
  | "id"
  | "name"
  | "description"
  | "countrySectorId"
  | "status"
  | "isInUse"
  | "impactedChildren"
>;

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
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<SubsectorFormRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted = params.row.status !== CountrySubsectorStatus.ACTIVE;
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
            />
          );
        },
      },
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
          const isDeleted = params.row.status !== CountrySubsectorStatus.ACTIVE;
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
        field: "description",
        headerName: "Descripción",
        flex: 2,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted = params.row.status !== CountrySubsectorStatus.ACTIVE;
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
            />
          );
        },
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        valueGetter: (_value, row: SubsectorFormRow) =>
          row.status === CountrySubsectorStatus.ACTIVE ? "Activo" : "Eliminado",
        renderCell: ({ row }: GridRenderCellParams<SubsectorFormRow>) =>
          row.status === CountrySubsectorStatus.ACTIVE ? (
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
        renderCell: (params: GridRenderCellParams<SubsectorFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted = params.row.status !== CountrySubsectorStatus.ACTIVE;

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
