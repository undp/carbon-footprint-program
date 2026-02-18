import { useMemo, useCallback } from "react";
import { Button } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { Category } from "@repo/types";

import { EditableTextCell, IconPickerCell } from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import type { FormCategory } from "./useCategoriesForm";

interface UseCategoryColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: keyof FormCategory,
    value: string
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: FormCategory) => void;
  onOpenExplanation: (rowIndex: number) => void;
  rows: FormCategory[];
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
  rows,
}: UseCategoryColumnsParams): GridColDef<Category>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  const cellClassName = "content-center";

  return useMemo<GridColDef<Category>[]>(
    () => [
      {
        field: "icon",
        headerName: "Icono",
        width: 80,
        headerAlign: "center",
        align: "center",
        cellClassName,
        renderCell: (params: GridRenderCellParams<Category>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          return (
            <IconPickerCell
              iconName={params.row.icon}
              color={params.row.color}
              isEditing={editing}
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
        cellClassName,
        renderCell: (params: GridRenderCellParams<Category>) => {
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
        cellClassName,
        renderCell: (params: GridRenderCellParams<Category>) => {
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
        cellClassName,
        renderCell: (params: GridRenderCellParams<Category>) => {
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
        field: "examples",
        headerName: "Explicación",
        width: 140,
        headerAlign: "center",
        align: "center",
        cellClassName,
        renderCell: (params: GridRenderCellParams<Category>) => {
          const rowIndex = getRowIndex(params.row.id);
          const hasContent = !!params.row.examples;
          return (
            <Button
              size="small"
              variant="outlined"
              startIcon={<InfoOutlined />}
              onClick={() => onOpenExplanation(rowIndex)}
              disabled={viewOnly && !hasContent}
              sx={{
                borderColor: hasContent ? "success.main" : "grey.400",
                color: hasContent ? "success.main" : "grey.600",
                textTransform: "none",
                "&:hover": {
                  borderColor: hasContent ? "success.dark" : "grey.500",
                  backgroundColor: hasContent ? "success.50" : "grey.50",
                },
              }}
            >
              {viewOnly ? "Ver" : hasContent ? "Ver/Editar" : "Agregar"}
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
              cellClassName,
              renderCell: (params: GridRenderCellParams<Category>) => (
                <ActionButtons
                  isActiveRow={false}
                  isEditing={isEditing(params.row.id)}
                  onStopEditCells={onStopEditRow}
                  onCancelEdit={onCancelEditRow}
                  onDelete={() => onDelete(params.row)}
                />
              ),
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
    ]
  );
};
