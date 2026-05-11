import { useMemo, useCallback } from "react";
import { Button } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { SubcategoryForm } from "@repo/types";

import {
  EditableTextCell,
  IconPickerCell,
  CategorySelectCell,
  MeasurementUnitsCell,
} from "../components/cells";
import { ActionButtons } from "../components/ActionButtons";
import type { MeasurementUnit, Subcategory } from "../types";

interface UseSubcategoryColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: keyof SubcategoryForm,
    value: string | string[] | null
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: SubcategoryForm) => void;
  onOpenExplanation: (rowIndex: number) => void;
  onConfigureVariables?: (rowId: string) => void;
  rows: SubcategoryForm[];
  categories: Array<{ id: string; name: string; color: string }>;
  allMeasurementUnits: MeasurementUnit[];
}

export const useSubcategoryColumns = ({
  editingRowId,
  viewOnly,
  onCellChange,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onDelete,
  onOpenExplanation,
  onConfigureVariables,
  rows,
  categories,
  allMeasurementUnits,
}: UseSubcategoryColumnsParams): GridColDef<Subcategory>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  return useMemo<GridColDef<Subcategory>[]>(
    () => [
      {
        field: "icon",
        headerName: "Ícono",
        width: 60,
        headerAlign: "center",
        align: "center",
        disableExport: true,
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          const formRow = rows[rowIndex];
          const categoryColor =
            categories.find((c) => c.id === formRow?.categoryId)?.color ?? "";
          return (
            <IconPickerCell
              iconName={params.row.icon}
              color={categoryColor}
              isEditing={editing}
              rowIndex={rowIndex}
              formArrayName="subcategories"
              hideColor
              onChangeIcon={(iconName) =>
                onCellChange(rowIndex, "icon", iconName)
              }
              onClick={
                !viewOnly && !editing ? () => onStartEditRow(rowId) : undefined
              }
            />
          );
        },
      },
      {
        field: "categoryId",
        headerName: "Categoría / Alcance",
        flex: 0.22,
        minWidth: 135,
        valueGetter: (_, row: Subcategory) => {
          const formRow = rows[getRowIndex(row.id)];
          return (
            categories.find((c) => c.id === formRow?.categoryId)?.name ?? ""
          );
        },
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          return (
            <CategorySelectCell
              formArrayName="subcategories"
              rowIndex={rowIndex}
              isEditing={editing}
              categories={categories}
              onChange={(categoryId) =>
                onCellChange(rowIndex, "categoryId", categoryId)
              }
              onClick={
                !viewOnly && !editing ? () => onStartEditRow(rowId) : undefined
              }
            />
          );
        },
      },
      {
        field: "name",
        headerName: "Sub-categoría",
        flex: 0.3,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          return (
            <EditableTextCell
              formArrayName="subcategories"
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                !viewOnly && !editing ? () => onStartEditRow(rowId) : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 0.5,
        minWidth: 250,
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          return (
            <EditableTextCell
              formArrayName="subcategories"
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                !viewOnly && !editing ? () => onStartEditRow(rowId) : undefined
              }
              multiline
              maxRows={3}
              truncateLines={3}
            />
          );
        },
      },
      {
        field: "measurementUnitIds",
        headerName: "Unidades aceptadas",
        width: 250,
        display: "flex",
        valueGetter: (_, row: Subcategory) => {
          const formRow = rows[getRowIndex(row.id)];
          const ids = formRow?.measurementUnitIds ?? [];
          return allMeasurementUnits
            .filter((u) => ids.includes(u.id))
            .map((u) => u.name)
            .join(", ");
        },
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const editing = isEditing(rowId);
          return (
            <MeasurementUnitsCell
              formArrayName="subcategories"
              rowIndex={rowIndex}
              isEditing={editing}
              allUnits={allMeasurementUnits}
              onChange={(unitIds) =>
                onCellChange(rowIndex, "measurementUnitIds", unitIds)
              }
              onClick={
                !viewOnly && !editing ? () => onStartEditRow(rowId) : undefined
              }
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
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
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
      {
        field: "actions",
        headerName: "Acciones",
        width: viewOnly ? 90 : 130,
        sortable: false,
        filterable: false,
        disableExport: true,
        headerAlign: "center" as const,
        align: "center" as const,
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          const anyEditing = editingRowId !== null;
          const rowId = params.row.id;
          const editing = isEditing(rowId);
          const rowIndex = getRowIndex(rowId);
          const formRow = rows[rowIndex];

          const isNewRow = params.row.id.startsWith("temp_");

          if (viewOnly) {
            return (
              <ActionButtons
                isActiveRow={false}
                onConfigureVariables={
                  onConfigureVariables
                    ? () => onConfigureVariables(params.row.id)
                    : undefined
                }
              />
            );
          }

          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onDelete={formRow ? () => onDelete(formRow) : undefined}
              onConfigureVariables={
                !isNewRow && onConfigureVariables
                  ? () => onConfigureVariables(params.row.id)
                  : undefined
              }
              deleteConfirmMessage="¿Estás seguro de que deseas eliminar esta subcategoría?"
            />
          );
        },
      },
    ],
    [
      viewOnly,
      getRowIndex,
      isEditing,
      onCellChange,
      onStartEditRow,
      categories,
      allMeasurementUnits,
      onOpenExplanation,
      editingRowId,
      rows,
      onStopEditRow,
      onCancelEditRow,
      onDelete,
      onConfigureVariables,
    ]
  );
};
