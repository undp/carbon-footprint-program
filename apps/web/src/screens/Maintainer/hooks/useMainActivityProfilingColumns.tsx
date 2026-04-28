import { useCallback, useMemo } from "react";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { RestoreOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  OrganizationMainActivityStatus,
  type GetAllAdminOrganizationMainActivitiesResponse,
} from "@repo/types";
import { EditableTextCell, EditableSelectCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import { DeleteWarningDialog } from "../components/dialogs/DeleteWarningDialog";

export type MainActivityFormRow = Pick<
  GetAllAdminOrganizationMainActivitiesResponse[number],
  | "id"
  | "name"
  | "description"
  | "countrySectorId"
  | "countrySubsectorId"
  | "status"
  | "isInUse"
  | "impactedChildren"
>;

interface SubsectorOption {
  id: string;
  name: string;
  countrySectorId: string;
  disabled?: boolean;
}

interface UseMainActivityProfilingColumnsParams {
  editingRowId: string | null;
  rows: MainActivityFormRow[];
  sectorOptions: Array<{ id: string; name: string; disabled?: boolean }>;
  subsectorOptions: SubsectorOption[];
  onCellChange: (
    rowIndex: number,
    field: "name" | "description",
    value: string
  ) => void;
  onSectorChange: (rowIndex: number, sectorId: string | null) => void;
  onSubsectorChange: (rowIndex: number, subsectorId: string | null) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: MainActivityFormRow) => void;
  onRestore: (row: MainActivityFormRow) => void;
  restoreDisabled: boolean;
}

export const useMainActivityProfilingColumns = ({
  editingRowId,
  rows,
  sectorOptions,
  subsectorOptions,
  onCellChange,
  onSectorChange,
  onSubsectorChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onRestore,
  restoreDisabled,
}: UseMainActivityProfilingColumnsParams): GridColDef<MainActivityFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<MainActivityFormRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 1,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<MainActivityFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status !== OrganizationMainActivityStatus.ACTIVE;
          return (
            <EditableTextCell
              formArrayName="mainActivities"
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
        field: "countrySectorId",
        headerName: "Rubro",
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: MainActivityFormRow) =>
          row.countrySectorId
            ? (sectorOptions.find((o) => o.id === row.countrySectorId)?.name ??
              "")
            : "",
        renderCell: (params: GridRenderCellParams<MainActivityFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status !== OrganizationMainActivityStatus.ACTIVE;
          return (
            <EditableSelectCell
              formArrayName="mainActivities"
              rowIndex={rowIndex}
              fieldName="countrySectorId"
              isEditing={editing}
              options={sectorOptions}
              allowEmpty
              emptyLabel="Sin rubro"
              onChange={(value) => onSectorChange(rowIndex, value)}
              onClick={
                !isDeleted && !editing ? () => onStartEditRow(rowId) : undefined
              }
            />
          );
        },
      },
      {
        field: "countrySubsectorId",
        headerName: "Subrubro",
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: MainActivityFormRow) =>
          row.countrySubsectorId
            ? (subsectorOptions.find((o) => o.id === row.countrySubsectorId)
                ?.name ?? "")
            : "",
        renderCell: (params: GridRenderCellParams<MainActivityFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status !== OrganizationMainActivityStatus.ACTIVE;
          const formRow = rows[rowIndex];
          const sectorId = formRow?.countrySectorId ?? null;
          const filteredOptions = sectorId
            ? subsectorOptions.filter((s) => s.countrySectorId === sectorId)
            : subsectorOptions;
          return (
            <EditableSelectCell
              formArrayName="mainActivities"
              rowIndex={rowIndex}
              fieldName="countrySubsectorId"
              isEditing={editing}
              options={filteredOptions}
              allowEmpty
              emptyLabel="Sin subrubro"
              onChange={(value) => onSubsectorChange(rowIndex, value)}
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
        flex: 1.5,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<MainActivityFormRow>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const isDeleted =
            params.row.status !== OrganizationMainActivityStatus.ACTIVE;
          return (
            <EditableTextCell
              formArrayName="mainActivities"
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
        valueGetter: (_value, row: MainActivityFormRow) =>
          row.status === OrganizationMainActivityStatus.ACTIVE
            ? "Activo"
            : "Eliminado",
        renderCell: ({ row }: GridRenderCellParams<MainActivityFormRow>) =>
          row.status === OrganizationMainActivityStatus.ACTIVE ? (
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
        renderCell: (params: GridRenderCellParams<MainActivityFormRow>) => {
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const anyEditing = editingRowId !== null;
          const isDeleted =
            params.row.status !== OrganizationMainActivityStatus.ACTIVE;

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
                  entityLabel="actividad principal"
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
      rows,
      sectorOptions,
      subsectorOptions,
      onCellChange,
      onSectorChange,
      onSubsectorChange,
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
