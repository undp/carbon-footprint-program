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
import { METHODOLOGY_ACTION_TOOLTIPS } from "../constants";
import { METHODOLOGY_STATUS_CONFIG } from "@/labels/chips/methodology";

type Methodology = GetAllMethodologiesResponse[number];

interface UseMethodologyColumnsParams {
  editingRowId: string | null;
  /**
   * When true, the maintainer is in methodology edit mode (configuring a
   * methodology's scopes), so all version row actions must be locked to keep
   * the focus on the methodology being edited.
   */
  actionsLocked: boolean;
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
  onDownloadExcel: (row: MethodologyVersionForm) => void;
  downloadingRowId: string | null;
  rows: MethodologyVersionForm[];
}

export const useMethodologyColumns = ({
  editingRowId,
  actionsLocked,
  onCellChange,
  onToggle,
  onStartEditRow,
  onStopEditRow,
  onCancelEditRow,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onDownloadExcel,
  downloadingRowId,
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
          const canEdit = !editing && !isActive && !actionsLocked;
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
          const canEdit = !editing && !isActive && !actionsLocked;
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
          const canEdit = !editing && !isActive && !actionsLocked;
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
          const canEdit = !editing && !isActive && !actionsLocked;
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
        valueGetter: (_, row: Methodology) =>
          METHODOLOGY_STATUS_CONFIG[row.status].label,
        renderCell: (params: GridRenderCellParams<Methodology>) => (
          <ToggleCell
            value={params.row.status === "PUBLISHED"}
            onChange={(checked) => onToggle(params.row, checked)}
            disabled={editingRowId !== null || actionsLocked}
          />
        ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 160,
        sortable: false,
        filterable: false,
        disableExport: true,
        headerAlign: "center",
        align: "right",
        cellClassName,
        renderCell: (params: GridRenderCellParams<Methodology>) => {
          const isPublished = params.row.status === "PUBLISHED";
          const isDownloading = downloadingRowId === params.row.id;
          return (
            <ActionButtons
              isActiveRow={editingRowId !== null && !isEditing(params.row.id)}
              isEditing={isEditing(params.row.id)}
              onStopEditCells={onStopEditRow}
              onCancelEdit={onCancelEditRow}
              onEdit={() => onEdit(params.row)}
              editDisabled={isPublished || actionsLocked}
              editTooltipTitle={
                actionsLocked
                  ? METHODOLOGY_ACTION_TOOLTIPS.lockedWhileEditing
                  : isPublished
                    ? METHODOLOGY_ACTION_TOOLTIPS.editActive
                    : undefined
              }
              onView={() => onView(params.row)}
              onDuplicate={() => onDuplicate(params.row)}
              duplicateDisabled={actionsLocked}
              duplicateTooltipTitle={
                actionsLocked
                  ? METHODOLOGY_ACTION_TOOLTIPS.lockedWhileEditing
                  : undefined
              }
              onDownloadExcel={() => onDownloadExcel(params.row)}
              downloadExcelDisabled={isDownloading || actionsLocked}
              downloadExcelTooltipTitle={
                isDownloading
                  ? "Generando archivo..."
                  : actionsLocked
                    ? METHODOLOGY_ACTION_TOOLTIPS.lockedWhileEditing
                    : "Descargar"
              }
              onDelete={() => onDelete(params.row)}
              deleteDisabled={isPublished || actionsLocked}
              deleteTooltipTitle={
                actionsLocked
                  ? METHODOLOGY_ACTION_TOOLTIPS.lockedWhileEditing
                  : isPublished
                    ? METHODOLOGY_ACTION_TOOLTIPS.deleteActive
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
      actionsLocked,
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
      onDownloadExcel,
      downloadingRowId,
    ]
  );
};
