import { useMemo, useCallback } from "react";
import { Button } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { CategoryForm } from "@repo/types";

import { EditableTextCell, IconPickerCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";

interface UseCategoryColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: keyof CategoryForm,
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: CategoryForm) => void;
  onOpenExplanation: (rowIndex: number) => void;
  onMoveUp: (row: CategoryForm) => void;
  onMoveDown: (row: CategoryForm) => void;
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

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.position - b.position),
    [rows]
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
      },
      {
        field: "icon",
        headerName: "Icono",
        width: 60,
        headerAlign: "center",
        align: "center",
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
              headerAlign: "center" as const,
              align: "center" as const,
              renderCell: (params: GridRenderCellParams<CategoryForm>) => {
                const sortedIdx = sortedRows.findIndex(
                  (r) => r.id === params.row.id
                );
                const isTemp = params.row.id.startsWith("temp_");
                const isFirst = sortedIdx === 0;
                const isLast = sortedIdx === sortedRows.length - 1;
                const anyEditing = editingRowId !== null;

                return (
                  // TODO: Create a better, and modular approach for actions buttons with different combinations
                  <ActionButtons
                    isActiveRow={anyEditing && !isEditing(params.row.id)}
                    isEditing={isEditing(params.row.id)}
                    onStopEditCells={onStopEditRow}
                    onCancelEdit={onCancelEditRow}
                    onMoveUp={() => onMoveUp(params.row)}
                    onMoveDown={() => onMoveDown(params.row)}
                    moveUpDisabled={anyEditing || isFirst || isTemp}
                    moveDownDisabled={anyEditing || isLast || isTemp}
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
      sortedRows,
      editingRowId,
    ]
  );
};
