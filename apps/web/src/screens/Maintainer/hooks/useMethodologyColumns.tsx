import { useMemo, useCallback } from "react";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { MethodologyWithRelations as Methodology } from "@repo/types";

import {
  EditableTextCell,
  MethodologyRegulationCell,
} from "../components/cells";
import { ToggleCell } from "../components/ToggleCell";
import { ActionButtons } from "../components/ActionButtons";
import { FormMethodology } from "./useMethodologiesForm";

interface UseMethodologyColumnsParams {
  editingRowId: string | null;
  onCellChange: (
    rowIndex: number,
    field: keyof FormMethodology,
    value: string
  ) => void;
  onToggle: (row: FormMethodology, checked: boolean) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onEdit: (row: FormMethodology) => void;
  onDuplicate: (row: FormMethodology) => void;
  onDelete: (row: FormMethodology) => void;
  rows: FormMethodology[];
}

export const useMethodologyColumns = ({
  editingRowId,
  onCellChange,
  onToggle,
  onStartEditRow,
  onStopEditRow,
  onEdit,
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

  const baseCellClass = "content-center";

  return useMemo(
    () => [
      {
        field: "name",
        headerName: "Nombre",
        flex: 0.5,
        maxWidth: 250,
        cellClassName: baseCellClass,
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
        cellClassName: baseCellClass,
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
        cellClassName: baseCellClass,
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
        cellClassName: baseCellClass,
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
        cellClassName: baseCellClass,
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
        align: "center",
        cellClassName: baseCellClass,
        renderCell: (params: GridRenderCellParams<Methodology>) => (
          <ActionButtons
            isActiveRow={params.row.status === "PUBLISHED"}
            isEditing={isEditing(params.row.id)}
            onStopEditCells={onStopEditRow}
            onEdit={() => onEdit(params.row)}
            onView={() => onEdit(params.row)}
            onDuplicate={() => onDuplicate(params.row)}
            onDelete={() => onDelete(params.row)}
          />
        ),
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
      onEdit,
      onDuplicate,
      onDelete,
    ]
  );
};
