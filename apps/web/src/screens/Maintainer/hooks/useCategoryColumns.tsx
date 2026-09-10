import { useMemo, useCallback } from "react";
import { Button } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { CategoryForm } from "@repo/types";

import { EditableTextCell, IconPickerCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import type { EditableCategoryField } from "./useCategoriesForm";

interface UseCategoryColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: EditableCategoryField,
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: CategoryForm) => void;
  onOpenExplanation: (rowIndex: number) => void;
  onMoveUp: (row: CategoryForm) => void;
  onMoveDown: (row: CategoryForm) => void;
  /**
   * Whether the row has a neighbour to swap with. Both come from
   * useMaintainerRowReorder, which is also where the move picks that neighbour:
   * deriving the sequence a second time here is how an enabled arrow ends up
   * disagreeing with what the move does.
   */
  canMoveUp: (row: CategoryForm) => boolean;
  canMoveDown: (row: CategoryForm) => boolean;
  /**
   * Reorder is off while the form is not in server order — see `isMoveBlocked`
   * in useMaintainerRowReorder — and while the grid is filtered, which renders
   * a different sequence than the one the arrows walk.
   */
  moveDisabled: boolean;
  rows: CategoryForm[];
}

export const useCategoryColumns = ({
  editingRowId,
  viewOnly,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onOpenExplanation,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  moveDisabled,
  rows,
}: UseCategoryColumnsParams): GridColDef<CategoryForm>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<CategoryForm>[]>(
    () => [
      {
        field: "position",
        headerName: "Pos.",
        width: 60,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<CategoryForm>) =>
          // A row the server has not created yet has no position to show.
          params.row.position ?? "—",
      },
      {
        field: "icon",
        headerName: "Ícono",
        width: 60,
        headerAlign: "center",
        align: "center",
        disableExport: true,
        renderCell: (params: GridRenderCellParams<CategoryForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <IconPickerCell
              iconName={params.row.icon}
              color={params.row.color}
              isEditing={editing}
              rowIndex={rowIndex}
              formArrayName="categories"
              onChangeIcon={(iconName) =>
                onCellChange(rowIndex, "icon", iconName)
              }
              onChangeColor={(color) => onCellChange(rowIndex, "color", color)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
            />
          );
        },
      },
      {
        field: "synonyms",
        headerName: "Categoría/Alcance",
        flex: 0.4,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<CategoryForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="categories"
              rowIndex={rowIndex}
              fieldName="synonyms"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "synonyms", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "name",
        headerName: "Nombre",
        flex: 0.4,
        minWidth: 180,
        renderCell: (params: GridRenderCellParams<CategoryForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="categories"
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 0.6,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<CategoryForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <EditableTextCell
              formArrayName="categories"
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                !viewOnly && !editing
                  ? () => onStartEditRow(params.row.id)
                  : undefined
              }
              multiline
              maxRows={3}
              truncateLines={2}
            />
          );
        },
      },
      {
        field: "explanation",
        headerName: "Explicación",
        width: 120,
        headerAlign: "center",
        align: "center",
        disableExport: true,
        renderCell: (params: GridRenderCellParams<CategoryForm>) => {
          const rowIndex = getRowIndex(params.row.id);
          const hasContent = !!params.row.explanation;
          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoOutlined />}
              onClick={() => onOpenExplanation(rowIndex)}
              disabled={viewOnly && !hasContent}
              sx={{
                maxWidth: "100px",
                borderColor: hasContent ? "success.main" : "grey.400",
                color: hasContent ? "success.main" : "grey.600",
                textTransform: "none",
                "&:hover": {
                  borderColor: hasContent ? "success.dark" : "grey.500",
                  backgroundColor: hasContent ? undefined : "grey.50",
                },
              }}
            >
              {viewOnly ? "Ver" : hasContent ? "Editar" : "Agregar"}
            </Button>
          );
        },
      },
      ...(!viewOnly
        ? [
            {
              field: "actions",
              headerName: "Acciones",
              width: 120,
              sortable: false,
              filterable: false,
              disableExport: true,
              headerAlign: "center" as const,
              align: "center" as const,
              renderCell: (params: GridRenderCellParams<CategoryForm>) => {
                const anyEditing = editingRowId !== null;
                const cannotMove = anyEditing || moveDisabled;

                return (
                  // TODO: Create a better, and modular approach for actions buttons with different combinations
                  <ActionButtons
                    isActiveRow={anyEditing && !isEditing(params.row.id)}
                    isEditing={isEditing(params.row.id)}
                    onStopEditCells={onStopEditRow}
                    onCancelEdit={onCancelEditRow}
                    onMoveUp={() => onMoveUp(params.row)}
                    onMoveDown={() => onMoveDown(params.row)}
                    moveUpDisabled={cannotMove || !canMoveUp(params.row)}
                    moveDownDisabled={cannotMove || !canMoveDown(params.row)}
                    onDelete={() => onDelete(params.row)}
                  />
                );
              },
            },
          ]
        : []),
    ],
    [
      getRowIndex,
      isEditing,
      viewOnly,
      onCellChange,
      onStartEditRow,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
      onOpenExplanation,
      onMoveUp,
      onMoveDown,
      canMoveUp,
      canMoveDown,
      moveDisabled,
      editingRowId,
    ]
  );
};
