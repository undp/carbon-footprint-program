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
import type { EditableSubcategoryField } from "./useSubcategoriesForm";

/** A form row that already has a place in its category's sequence. */
type PositionedSubcategoryRow = SubcategoryForm & { position: number };

interface UseSubcategoryColumnsParams {
  editingRowId: string | null;
  viewOnly: boolean;
  onCellChange: (
    rowIndex: number,
    field: EditableSubcategoryField,
    value: string | string[] | null
  ) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onDelete: (row: SubcategoryForm) => void;
  onOpenExplanation: (rowIndex: number) => void;
  onConfigureVariables?: (rowId: string) => void;
  onMoveUp: (row: SubcategoryForm) => void;
  onMoveDown: (row: SubcategoryForm) => void;
  /**
   * Reorder is off while the form is not in server order — see `isMoveBlocked`
   * in useMaintainerRowReorder — and while the grid is filtered. The arrows are
   * computed from `position` over every row, the grid renders in form-array
   * order and only the rows it was told to show, and the two only agree once
   * the listing refetch has been replayed into an unfiltered grid.
   */
  moveDisabled: boolean;
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
  onMoveUp,
  onMoveDown,
  moveDisabled,
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

  // Positions are unique per category, not across the grid, so a row's
  // neighbours are its siblings inside its own category.
  const siblingsByCategory = useMemo(() => {
    const groups = new Map<string, PositionedSubcategoryRow[]>();
    // A row the server has not created yet has no position, so it is not in the
    // sequence the arrows walk — leaving it in would make the first real row of
    // its category look like it has a neighbour above it.
    const positionedRows = rows.filter(
      (row): row is PositionedSubcategoryRow => row.position !== null
    );
    for (const row of positionedRows) {
      // Pushed, not re-spread: `rows` is form.watch output, so this runs on
      // every keystroke in an editing row, and copying each group per member
      // makes that quadratic in the number of subcategories.
      const siblings = groups.get(row.categoryId);
      if (siblings) {
        siblings.push(row);
      } else {
        groups.set(row.categoryId, [row]);
      }
    }
    for (const siblings of groups.values()) {
      siblings.sort((a, b) => a.position - b.position);
    }
    return groups;
  }, [rows]);

  return useMemo<GridColDef<Subcategory>[]>(
    () => [
      {
        field: "position",
        headerName: "Pos.",
        width: 60,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<Subcategory>) => {
          // Read off the form row like every other column here: the grid row is
          // typed as the server `Subcategory`, whose position is never null,
          // while the rows the grid actually holds are form rows — and a row
          // the server has not created yet has no position to show.
          const formRow = rows[getRowIndex(params.row.id)];
          return formRow?.position ?? "—";
        },
      },
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

          const siblings = formRow
            ? (siblingsByCategory.get(formRow.categoryId) ?? [])
            : [];
          const siblingIdx = siblings.findIndex((r) => r.id === rowId);
          const isFirstInCategory = siblingIdx === 0;
          const isLastInCategory = siblingIdx === siblings.length - 1;
          const cannotMove = anyEditing || isNewRow || !formRow || moveDisabled;

          return (
            <ActionButtons
              isActiveRow={anyEditing && !editing}
              isEditing={editing}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onMoveUp={formRow ? () => onMoveUp(formRow) : undefined}
              onMoveDown={formRow ? () => onMoveDown(formRow) : undefined}
              moveUpDisabled={cannotMove || isFirstInCategory}
              moveDownDisabled={cannotMove || isLastInCategory}
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
      onMoveUp,
      onMoveDown,
      moveDisabled,
      siblingsByCategory,
    ]
  );
};
