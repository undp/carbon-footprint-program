import { useMemo, useCallback } from "react";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type {
  GetAllMethodologiesResponse,
  MethodologyVersionForm,
} from "@repo/types";

import {
  EditableTextCell,
  MethodologyRegulationCell,
} from "../components/cells";
import { ToggleCell } from "../components/ToggleCell";
import { ActionButtons } from "../components/ActionButtons";

type Methodology = GetAllMethodologiesResponse[number];

interface UseMethodologyColumnsParams {
  editingRowId: string | null;
  onCellChange: (
    rowIndex: number,
    field: keyof MethodologyVersionForm,
    value: string
  ) => void;
  onToggle: (row: MethodologyVersionForm, checked: boolean) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onCancelEditRow: () => void;
  onEdit: (row: MethodologyVersionForm) => void;
  onView: (row: MethodologyVersionForm) => void;
  onDuplicate: (row: MethodologyVersionForm) => void;
  onDelete: (row: MethodologyVersionForm) => void;
  rows: MethodologyVersionForm[];
}

export const useMethodologyColumns = ({
  editingRowId,
  onCellChange,
  onToggle,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  rows,
}: UseMethodologyColumnsParams): GridColDef<Methodology>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );
  const isEditing = useCallback(
    (rowId: string) => editingRowId === rowId,
    [editingRowId]
  );

  const cellClassName = "content-center";

  return useMemo<GridColDef<Methodology>[]>(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 0.5,
        maxWidth: 250,
        cellClassName,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isActive = params.row.status === "PUBLISHED";
          const canEdit = !editing && !isActive;
          return (
            <EditableTextCell
              rowIndex={rowIndex}
              fieldName="name"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "name", value)}
              onClick={
                canEdit ? () => onStartEditRow(params.row.id) : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 1,
        minWidth: 200,
        cellClassName,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isActive = params.row.status === "PUBLISHED";
          const canEdit = !editing && !isActive;
          return (
            <EditableTextCell
              rowIndex={rowIndex}
              fieldName="description"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "description", value)}
              onClick={
                canEdit ? () => onStartEditRow(params.row.id) : undefined
              }
              multiline
              maxRows={3}
              truncateLines={2}
            />
          );
        },
      },
      {
        field: "regulation",
        headerName: "Normativa",
        width: 200,
        cellClassName,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isActive = params.row.status === "PUBLISHED";
          const canEdit = !editing && !isActive;
          return (
            <MethodologyRegulationCell
              rowIndex={rowIndex}
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "regulation", value)}
              onClick={
                canEdit ? () => onStartEditRow(params.row.id) : undefined
              }
            />
          );
        },
      },
      {
        field: "version",
        headerName: "Versión",
        width: 100,
        cellClassName,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          const editing = isEditing(params.row.id);
          const isActive = params.row.status === "PUBLISHED";
          const canEdit = !editing && !isActive;
          return (
            <EditableTextCell
              rowIndex={rowIndex}
              fieldName="version"
              isEditing={editing}
              onChange={(value) => onCellChange(rowIndex, "version", value)}
              onClick={
                canEdit ? () => onStartEditRow(params.row.id) : undefined
              }
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "active",
        headerName: "Estado",
        width: 90,
        cellClassName,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<Methodology>) => (
          <ToggleCell
            value={params.row.status === "PUBLISHED"}
            onChange={(checked) => onToggle(params.row, checked)}
            disabled={editingRowId !== null}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 160,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "right",
        cellClassName,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const isPublished = params.row.status === "PUBLISHED";
          return (
            <ActionButtons
              isActiveRow={editingRowId !== null && !isEditing(params.row.id)}
              isEditing={isEditing(params.row.id)}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onEdit={() => onEdit(params.row)}
              onView={() => onView(params.row)}
              onDuplicate={() => onDuplicate(params.row)}
              onDelete={() => onDelete(params.row)}
              deleteDisabled={isPublished}
              deleteTooltipTitle={
                isPublished
                  ? "No se puede eliminar una metodología activa"
                  : undefined
              }
            />
          );
        },
      },
    ],
    [
      getRowIndex,
      isEditing,
      onCellChange,
      onToggle,
      editingRowId,
      onStartEditRow,
      onStopEditRow,
      onCancelEditRow,
      onEdit,
      onView,
      onDuplicate,
      onDelete,
    ]
  );
};
