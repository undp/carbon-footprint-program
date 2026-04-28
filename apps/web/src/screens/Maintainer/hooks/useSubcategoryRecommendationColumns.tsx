import { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseIcon from "@mui/icons-material/Close";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { GetAllCountrySectorsResponse } from "@repo/types";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";
import {
  isNewRow,
  type SubcategoryRecommendationRow,
} from "./useSubcategoryRecommendationsForm";

interface SubcategoryOption {
  id: string;
  name: string;
}

interface UseSubcategoryRecommendationColumnsParams {
  sectors: GetAllCountrySectorsResponse;
  subcategories: SubcategoryOption[];
  nullSubsectorLabel: string;
  onChangeSector: (rowIndex: number, sectorId: string) => void;
  onChangeSubsector: (rowIndex: number, subsectorId: string | null) => void;
  onOpenEdit: (rowIndex: number) => void;
  onSaveRow: (rowIndex: number) => void;
  onCancelRow: (rowIndex: number) => void;
  isRowDirty: (rowId: string) => boolean;
  savingRowId: string | null;
  rows: SubcategoryRecommendationRow[];
}

export const useSubcategoryRecommendationColumns = ({
  sectors,
  subcategories,
  nullSubsectorLabel,
  onChangeSector,
  onChangeSubsector,
  onOpenEdit,
  onSaveRow,
  onCancelRow,
  isRowDirty,
  savingRowId,
  rows,
}: UseSubcategoryRecommendationColumnsParams): GridColDef<SubcategoryRecommendationRow>[] => {
  const subcategoriesById = useMemo(
    () => new Map(subcategories.map((sc) => [sc.id, sc])),
    [subcategories]
  );

  const rowIndexById = useMemo(
    () => new Map(rows.map((r, i) => [r.id, i])),
    [rows]
  );

  return useMemo<GridColDef<SubcategoryRecommendationRow>[]>(
    () => [
      {
        field: "sectorName",
        headerName: "Sector",
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          if (rowIndex < 0) return null;

          if (isNewRow(params.row.id)) {
            return (
              <Select
                fullWidth
                size="small"
                value={params.row.sectorId}
                displayEmpty
                onChange={(e) => onChangeSector(rowIndex, e.target.value)}
              >
                <MenuItem value="" disabled>
                  Seleccionar sector
                </MenuItem>
                {sectors.map((sector) => (
                  <MenuItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }
          return (
            <Typography variant="body2" noWrap title={params.row.sectorName}>
              {params.row.sectorName}
            </Typography>
          );
        },
      },
      {
        field: "subsectorName",
        headerName: "Subsector",
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          if (rowIndex < 0) return null;

          if (isNewRow(params.row.id)) {
            const selectedSector = sectors.find(
              (s) => s.id === params.row.sectorId
            );
            const availableSubsectors = selectedSector?.subsectors ?? [];
            const selectValue = params.row.subsectorId ?? "__NULL__";
            return (
              <Select
                fullWidth
                size="small"
                value={selectValue}
                disabled={!params.row.sectorId}
                onChange={(e) => {
                  const raw = e.target.value;
                  onChangeSubsector(rowIndex, raw === "__NULL__" ? null : raw);
                }}
              >
                <MenuItem value="__NULL__">{nullSubsectorLabel}</MenuItem>
                {availableSubsectors.map((sub) => (
                  <MenuItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </MenuItem>
                ))}
              </Select>
            );
          }
          const label = params.row.subsectorName ?? nullSubsectorLabel;
          return (
            <Typography variant="body2" noWrap title={label}>
              {label}
            </Typography>
          );
        },
      },
      {
        field: "subcategoryIds",
        headerName: "Subcategorías",
        flex: 3,
        minWidth: 320,
        sortable: false,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          if (rowIndex < 0) return null;

          const selectedSubcategories = params.row.subcategoryIds
            .map((id) => subcategoriesById.get(id))
            .filter((sc): sc is SubcategoryOption => sc !== undefined);
          const preview = selectedSubcategories.slice(0, 3);
          const remaining = selectedSubcategories.length - preview.length;

          const editDisabled = isNewRow(params.row.id) && !params.row.sectorId;

          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ width: "100%", overflow: "hidden" }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "nowrap",
                  gap: 0.5,
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                {preview.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    Sin subcategorías seleccionadas
                  </Typography>
                ) : (
                  preview.map((sub) => (
                    <Tooltip key={sub.id} title={sub.name} arrow>
                      <Chip
                        label={sub.name}
                        size="small"
                        sx={{ maxWidth: 200 }}
                      />
                    </Tooltip>
                  ))
                )}
                {remaining > 0 && (
                  <Chip label={`+${remaining}`} size="small" color="default" />
                )}
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                disabled={editDisabled}
                onClick={() => onOpenEdit(rowIndex)}
              >
                Editar subcategorías
              </Button>
            </Stack>
          );
        },
      },
      {
        field: "_actions",
        headerName: "",
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          if (rowIndex < 0) return null;
          if (!isRowDirty(params.row.id)) return null;
          const isSaving = savingRowId === params.row.id;
          const saveDisabled =
            isSaving ||
            (isNewRow(params.row.id) &&
              (!params.row.sectorId || params.row.subcategoryIds.length === 0));

          return (
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                color="primary"
                disabled={saveDisabled}
                onClick={() => onSaveRow(rowIndex)}
                aria-label={SUBCATEGORY_RECOMMENDATIONS_LABELS.saveRowAriaLabel}
              >
                <SaveOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={isSaving}
                onClick={() => onCancelRow(rowIndex)}
                aria-label={
                  SUBCATEGORY_RECOMMENDATIONS_LABELS.cancelRowAriaLabel
                }
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        },
      },
    ],
    [
      rowIndexById,
      sectors,
      subcategoriesById,
      nullSubsectorLabel,
      onChangeSector,
      onChangeSubsector,
      onOpenEdit,
      onSaveRow,
      onCancelRow,
      isRowDirty,
      savingRowId,
    ]
  );
};
