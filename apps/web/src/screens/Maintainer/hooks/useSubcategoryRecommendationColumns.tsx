import { useMemo, useCallback } from "react";
import { Box, Button, Chip, MenuItem, Select, Typography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { GetAllCountrySectorsResponse } from "@repo/types";
import { SubcategoryRecommendationModeEnum } from "@repo/types";
import type { SubcategoryRecommendationFormRow } from "./useSubcategoryRecommendationsForm";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";

interface UseSubcategoryRecommendationColumnsParams {
  editingRowId: string | null;
  sectors: GetAllCountrySectorsResponse;
  mode: string | undefined;
  onStartEditRow: (rowId: string) => void;
  onOpenTransferList: (rowId: string) => void;
  onSectorChange: (rowIndex: number, sectorId: number | null) => void;
  onSubsectorChange: (rowIndex: number, subsectorId: number | null) => void;
  onSaveNewRow: () => void;
  onCancelNewRow: () => void;
  rows: SubcategoryRecommendationFormRow[];
}

const NULL_SUBSECTOR_ID = "__null__";

export const useSubcategoryRecommendationColumns = ({
  editingRowId,
  sectors,
  mode,
  onStartEditRow,
  onOpenTransferList,
  onSectorChange,
  onSubsectorChange,
  onSaveNewRow,
  onCancelNewRow,
  rows,
}: UseSubcategoryRecommendationColumnsParams): GridColDef<SubcategoryRecommendationFormRow>[] => {
  const getRowIndex = useCallback(
    (rowId: string) => rows.findIndex((r) => r.id === rowId),
    [rows]
  );

  const nullSubsectorLabel =
    mode === SubcategoryRecommendationModeEnum.UNION
      ? SUBCATEGORY_RECOMMENDATIONS_LABELS.ALL_SUBSECTORS
      : SUBCATEGORY_RECOMMENDATIONS_LABELS.NO_SUBSECTOR;

  return useMemo<GridColDef<SubcategoryRecommendationFormRow>[]>(
    () => [
      {
        field: "sectorName",
        headerName: SUBCATEGORY_RECOMMENDATIONS_LABELS.SECTOR,
        flex: 1,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationFormRow>
        ) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const isEditing = editingRowId === rowId;
          const isNew = rowId.startsWith("temp-");

          if (isEditing && isNew) {
            return (
              <Select
                size="small"
                fullWidth
                value={
                  params.row.sectorId !== null
                    ? String(params.row.sectorId)
                    : ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onSectorChange(rowIndex, val === "" ? null : Number(val));
                }}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Seleccionar sector</em>
                </MenuItem>
                {sectors.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }

          return (
            <Typography
              variant="body2"
              sx={{ cursor: isEditing ? "default" : "pointer" }}
              onClick={() => !editingRowId && onStartEditRow(rowId)}
            >
              {params.row.sectorName || "—"}
            </Typography>
          );
        },
      },
      {
        field: "subsectorName",
        headerName: SUBCATEGORY_RECOMMENDATIONS_LABELS.SUBSECTOR,
        flex: 1,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationFormRow>
        ) => {
          const rowId = params.row.id;
          const rowIndex = getRowIndex(rowId);
          const isEditing = editingRowId === rowId;
          const isNew = rowId.startsWith("temp-");
          const selectedSector = sectors.find(
            (s) => s.id === String(params.row.sectorId)
          );
          const subsectors = selectedSector?.subsectors ?? [];

          if (isEditing && isNew) {
            return (
              <Select
                size="small"
                fullWidth
                value={
                  params.row.subsectorId === null
                    ? NULL_SUBSECTOR_ID
                    : String(params.row.subsectorId)
                }
                onChange={(e) => {
                  const val = e.target.value;
                  onSubsectorChange(
                    rowIndex,
                    val === NULL_SUBSECTOR_ID || val === "" ? null : Number(val)
                  );
                }}
                displayEmpty
                disabled={!params.row.sectorId}
              >
                <MenuItem value={NULL_SUBSECTOR_ID}>
                  {nullSubsectorLabel}
                </MenuItem>
                {subsectors.map((sub) => (
                  <MenuItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }

          const displayName =
            params.row.subsectorId === null
              ? nullSubsectorLabel
              : (params.row.subsectorName ?? "—");

          return (
            <Typography
              variant="body2"
              sx={{ cursor: isEditing ? "default" : "pointer" }}
              onClick={() => !editingRowId && onStartEditRow(rowId)}
            >
              {displayName}
            </Typography>
          );
        },
      },
      {
        field: "subcategoryIds",
        headerName: SUBCATEGORY_RECOMMENDATIONS_LABELS.SUBCATEGORIES_COLUMN,
        flex: 2,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationFormRow>
        ) => {
          const rowId = params.row.id;
          const isEditing = editingRowId === rowId;
          const isNew = rowId.startsWith("temp-");
          const count = params.row.subcategoryIds.length;

          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {count > 0 ? (
                <Chip
                  label={`${count} subcategoría${count !== 1 ? "s" : ""}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ) : (
                <Typography variant="body2" color="text.disabled">
                  Sin subcategorías
                </Typography>
              )}
              {(isEditing || !editingRowId) && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onOpenTransferList(rowId)}
                >
                  {SUBCATEGORY_RECOMMENDATIONS_LABELS.EDIT_SUBCATEGORIES}
                </Button>
              )}
              {isEditing && isNew && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => void onSaveNewRow()}
                  >
                    {SUBCATEGORY_RECOMMENDATIONS_LABELS.SAVE_ROW}
                  </Button>
                  <Button size="small" variant="text" onClick={onCancelNewRow}>
                    {SUBCATEGORY_RECOMMENDATIONS_LABELS.CANCEL_ROW}
                  </Button>
                </>
              )}
            </Box>
          );
        },
      },
    ],
    [
      editingRowId,
      sectors,
      nullSubsectorLabel,
      getRowIndex,
      onStartEditRow,
      onOpenTransferList,
      onSectorChange,
      onSubsectorChange,
      onSaveNewRow,
      onCancelNewRow,
    ]
  );
};
