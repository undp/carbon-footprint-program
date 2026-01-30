import { useMemo, useCallback } from "react";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { Methodology } from "../types";
import {
  EditableTextCell,
  MethodologyNormativaCell,
} from "../components/cells";
import { ToggleCell } from "../components/ToggleCell";
import { ActionButtons } from "../components/ActionButtons";

interface UseMethodologyColumnsParams {
  editingRowId: string | null;
  onCellChange: (
    rowIndex: number,
    field: keyof Methodology,
    value: string
  ) => void;
  onToggle: (row: Methodology, checked: boolean) => void;
  onStartEditRow: (rowId: string) => void;
  onStopEditRow: () => void;
  onEdit: (row: Methodology) => void;
  onDuplicate: (row: Methodology) => void;
  onDelete: (row: Methodology) => void;
  rows: Methodology[];
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
        field: "nombre",
        headerName: "Nombre",
        flex: 0.5,
        maxWidth: 250,
        cellClassName: baseCellClass,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          return (
            <EditableTextCell
              rowIndex={rowIndex}
              fieldName="nombre"
              isEditing={isEditing(params.row.id)}
              onChange={(value) => onCellChange(rowIndex, "nombre", value)}
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "descripcion",
        headerName: "Descripción",
        flex: 1,
        minWidth: 200,
        cellClassName: baseCellClass,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          return (
            <EditableTextCell
              rowIndex={rowIndex}
              fieldName="descripcion"
              isEditing={isEditing(params.row.id)}
              onChange={(value) => onCellChange(rowIndex, "descripcion", value)}
              multiline
              maxRows={3}
              truncateLines={2}
            />
          );
        },
      },
      {
        field: "normativa",
        headerName: "Normativa",
        width: 150,
        cellClassName: baseCellClass,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const rowIndex = getRowIndex(params.row.id);
          return (
            <MethodologyNormativaCell
              rowIndex={rowIndex}
              isEditing={isEditing(params.row.id)}
              onChange={(value) => onCellChange(rowIndex, "normativa", value)}
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
          return (
            <EditableTextCell
              rowIndex={rowIndex}
              fieldName="version"
              isEditing={isEditing(params.row.id)}
              onChange={(value) => onCellChange(rowIndex, "version", value)}
              truncateLines={1}
            />
          );
        },
      },
      {
        field: "activo",
        headerName: "Estado",
        width: 90,
        cellClassName: baseCellClass,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<Methodology>) => (
          <ToggleCell
            value={params.row.activo}
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
        cellClassName: baseCellClass,
        renderCell: (params: GridRenderCellParams<Methodology>) => (
          <ActionButtons
            isActiveRow={params.row.activo}
            isEditing={isEditing(params.row.id)}
            onStartEditCells={
              !params.row.activo
                ? () => onStartEditRow(params.row.id)
                : undefined
            }
            onStopEditCells={!params.row.activo ? onStopEditRow : undefined}
            onEdit={!params.row.activo ? () => onEdit(params.row) : undefined}
            onView={params.row.activo ? () => onEdit(params.row) : undefined}
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
