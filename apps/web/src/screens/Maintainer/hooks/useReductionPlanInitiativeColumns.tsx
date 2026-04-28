import { useMemo, useCallback } from "react";
import { Typography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  EditableTextCell,
  SubcategoryGroupedSelectCell,
  type SubcategoryGroupedOption,
} from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import type { ReductionPlanInitiativeFormRow } from "./useReductionPlanInitiativesForm";

const FIELD_ARRAY_NAME = "reductionPlanInitiatives";

interface UseReductionPlanInitiativeColumnsParams {
  editingRowId: string | null;
  newRowId: string | null;
  onCellChange: (
    rowIndex: number,
    field: keyof ReductionPlanInitiativeFormRow,
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: ReductionPlanInitiativeFormRow) => void;
  rows: ReductionPlanInitiativeFormRow[];
  subcategories: SubcategoryGroupedOption[];
}

export const useReductionPlanInitiativeColumns = ({
  editingRowId,
  newRowId,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  rows,
  subcategories,
}: UseReductionPlanInitiativeColumnsParams): GridColDef<ReductionPlanInitiativeFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<ReductionPlanInitiativeFormRow>[]>(
    () => [
      {
        field: "subcategoryId",
        headerName: "Subcategoría",
        flex: 0.25,
        minWidth: 200,
        renderCell: (
          params: GridRenderCellParams<ReductionPlanInitiativeFormRow>
        ) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const row = rows[rowIndex];

          if (editing) {
            return (
              <SubcategoryGroupedSelectCell
                formArrayName={FIELD_ARRAY_NAME}
                rowIndex={rowIndex}
                fieldName="subcategoryId"
                value={row?.subcategoryId ?? ""}
                onChange={(value) =>
                  onCellChange(rowIndex, "subcategoryId", value)
                }
                subcategories={subcategories}
              />
            );
          }

          const name =
            subcategories.find((sc) => sc.id === row?.subcategoryId)?.name ??
            "";
          return (
            <Typography
              variant="body2"
              onClick={() => onStartEditRow(params.row.id)}
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                width: "100%",
                "&:hover": { backgroundColor: "grey.100" },
              }}
            >
              {name}
            </Typography>
          );
        },
      },
      {
        field: "title",
        headerName: "Nombre",
        flex: 0.3,
        minWidth: 180,
        renderCell: (
          params: GridRenderCellParams<ReductionPlanInitiativeFormRow>
        ) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName={FIELD_ARRAY_NAME}
              rowIndex={rowIndex}
              fieldName="title"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "title", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              truncateLines={2}
              autoFocus={editing && params.row.id === newRowId}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 0.45,
        minWidth: 250,
        renderCell: (
          params: GridRenderCellParams<ReductionPlanInitiativeFormRow>
        ) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName={FIELD_ARRAY_NAME}
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              multiline
              maxRows={3}
              truncateLines={3}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 130,
        sortable: false,
        filterable: false,
        headerAlign: "center" as const,
        align: "center" as const,
        renderCell: (
          params: GridRenderCellParams<ReductionPlanInitiativeFormRow>
        ) => {
          const anyEditing = editingRowId !== null;
          const editing = isEditing(params.row.id);
          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onDelete={() => onDelete(params.row)}
              deleteConfirmMessage="Los planes de reducción existentes seguirán mostrando el nombre de la iniciativa. ¿Eliminar?"
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
      subcategories,
      rows,
      editingRowId,
      newRowId,
    ]
  );
};
