import { useMemo, useCallback } from "react";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  EditableTextCell,
  AutocompleteCell,
  type AutocompleteCellOption,
} from "../../components/cells";
import { ActionButtons } from "../../components/ActionButtons";
import type { InitiativeFormRow } from "./useInitiativesForm";

interface UseInitiativeColumnsParams {
  editingRowId: string | null;
  onCellChange: (
    rowIndex: number,
    field: keyof InitiativeFormRow,
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: InitiativeFormRow) => void;
  onCategoryChange: (rowIndex: number, categoryId: string) => void;
  rows: InitiativeFormRow[];
  categories: AutocompleteCellOption[];
  subcategories: Array<AutocompleteCellOption & { categoryId: string }>;
}

export const useInitiativeColumns = ({
  editingRowId,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onCategoryChange,
  rows,
  categories,
  subcategories,
}: UseInitiativeColumnsParams): GridColDef<InitiativeFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<InitiativeFormRow>[]>(
    () => [
      {
        field: "title",
        headerName: "Nombre",
        flex: 0.3,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="initiatives"
              rowIndex={rowIndex}
              fieldName="title"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "title", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              truncateLines={2}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 0.5,
        minWidth: 260,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="initiatives"
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              multiline
              maxRows={6}
              truncateLines={4}
            />
          );
        },
      },
      {
        field: "categoryId",
        headerName: "Categoría",
        flex: 0.25,
        minWidth: 160,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <AutocompleteCell
              formArrayName="initiatives"
              rowIndex={rowIndex}
              fieldName="categoryId"
              isEditing={editing}
              options={categories}
              onChange={(value) => onCategoryChange(rowIndex, value)}
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              placeholder="Seleccionar…"
            />
          );
        },
      },
      {
        field: "subcategoryId",
        headerName: "Subcategoría",
        flex: 0.25,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const row = rows[rowIndex];
          const filtered = subcategories.filter(
            (s) => s.categoryId === row?.categoryId
          );
          return (
            <AutocompleteCell
              formArrayName="initiatives"
              rowIndex={rowIndex}
              fieldName="subcategoryId"
              isEditing={editing}
              options={filtered}
              disabled={!row?.categoryId}
              onChange={(value) =>
                onCellChange(rowIndex, "subcategoryId", value)
              }
              onClick={
                !editing ? () => onStartEditRow(params.row.id) : undefined
              }
              placeholder={
                row?.categoryId
                  ? "Seleccionar…"
                  : "Selecciona una categoría primero"
              }
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
        renderCell: (params: GridRenderCellParams<InitiativeFormRow>) => {
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
      onCategoryChange,
      categories,
      subcategories,
      rows,
      editingRowId,
    ]
  );
};
