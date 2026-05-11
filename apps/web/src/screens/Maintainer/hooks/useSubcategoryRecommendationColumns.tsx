import { FC, useMemo } from "react";
import {
  Box,
  Chip,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
} from "@mui/icons-material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { GetAllCountrySectorsResponse } from "@repo/types";
import { useOverflowTooltip } from "@/hooks";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";
import { ActionIconButton } from "@/components/ActionIconButton";
import {
  isNewRow,
  type SubcategoryRecommendationRow,
} from "./useSubcategoryRecommendationsForm";

interface SubcategoryOption {
  id: string;
  name: string;
}

interface SubcategoryChipProps {
  name: string;
  onClick: () => void;
}

const SubcategoryChip: FC<SubcategoryChipProps> = ({ name, onClick }) => {
  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLSpanElement>([
    name,
  ]);
  return (
    <Tooltip
      title={isOverflowed ? name : ""}
      arrow
      placement="top"
      enterDelay={500}
    >
      <Chip
        size="small"
        label={
          <Box
            component="span"
            ref={overflowRef}
            sx={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </Box>
        }
        sx={{
          maxWidth: 200,
          "& .MuiChip-label": {
            display: "block",
            minWidth: 0,
          },
        }}
        onClick={onClick}
      />
    </Tooltip>
  );
};

interface UseSubcategoryRecommendationColumnsParams {
  sectors: GetAllCountrySectorsResponse;
  subcategories: SubcategoryOption[];
  nullSubsectorLabel: string;
  onChangeSector: (rowIndex: number, sectorId: string) => void;
  onChangeSubsector: (rowIndex: number, subsectorId: string | null) => void;
  onOpenEdit: (rowIndex: number) => void;
  onDeleteRow: (rowIndex: number) => void;
  onSaveRow: (rowIndex: number) => void;
  onCancelRow: (rowIndex: number) => void;
  isRowDirty: (rowId: string) => boolean;
  savingRowId: string | null;
  rows: SubcategoryRecommendationRow[];
  invalidRowIds: ReadonlySet<string>;
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
  onDeleteRow,
  isRowDirty,
  savingRowId,
  rows,
  invalidRowIds,
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
        headerName: "Rubro",
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          if (rowIndex < 0) return null;

          if (isNewRow(params.row.id)) {
            const showSectorError =
              invalidRowIds.has(params.row.id) && !params.row.sectorId;
            return (
              <Select
                fullWidth
                size="small"
                value={params.row.sectorId}
                displayEmpty
                error={showSectorError}
                onChange={(e) => onChangeSector(rowIndex, e.target.value)}
              >
                <MenuItem value="" disabled>
                  Seleccionar rubro
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
        headerName: "Subrubro",
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
        valueGetter: (_, row: SubcategoryRecommendationRow) =>
          row.subcategoryIds
            .map((id) => subcategoriesById.get(id)?.name)
            .filter((name): name is string => !!name)
            .sort((a, b) => a.localeCompare(b))
            .join(", "),
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          if (rowIndex < 0) return null;

          const selectedSubcategories = params.row.subcategoryIds
            .map((id) => subcategoriesById.get(id))
            .filter((sc): sc is SubcategoryOption => sc !== undefined)
            .sort((a, b) => a.name.localeCompare(b.name));
          const preview = selectedSubcategories.slice(0, 3);
          const hidden = selectedSubcategories.slice(preview.length);
          const remaining = hidden.length;

          const showSubcategoriesError =
            invalidRowIds.has(params.row.id) &&
            params.row.subcategoryIds.length === 0;

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
                //
              >
                {preview.length === 0 ? (
                  <Typography
                    variant="body2"
                    color={showSubcategoriesError ? "error" : "text.secondary"}
                    fontStyle="italic"
                    onClick={() => onOpenEdit(rowIndex)}
                    sx={{ cursor: "pointer" }}
                  >
                    Seleccione subcategorías aqui
                  </Typography>
                ) : (
                  preview.map((sub) => (
                    <SubcategoryChip
                      key={sub.id}
                      name={sub.name}
                      onClick={() => onOpenEdit(rowIndex)}
                    />
                  ))
                )}
                {remaining > 0 && (
                  <Tooltip
                    arrow
                    placement="top"
                    title={
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {hidden.map((sub) => (
                          <li key={sub.id}>{sub.name}</li>
                        ))}
                      </Box>
                    }
                  >
                    <Chip
                      label={`+${remaining}`}
                      size="small"
                      color="default"
                      onClick={() => onOpenEdit(rowIndex)}
                    />
                  </Tooltip>
                )}
              </Box>
            </Stack>
          );
        },
      },
      {
        field: "_actions",
        headerName: "Acciones",
        width: 120,
        sortable: false,
        filterable: false,
        disableExport: true,
        disableColumnMenu: true,
        renderCell: (
          params: GridRenderCellParams<SubcategoryRecommendationRow>
        ) => {
          const rowIndex = rowIndexById.get(params.row.id) ?? -1;
          const isNew = isNewRow(params.row.id);

          const isSaving = savingRowId === params.row.id;
          const isDirty = isRowDirty(params.row.id);

          return (
            <Stack direction="row" spacing={0.5}>
              {isDirty && (
                <>
                  <ActionIconButton
                    icon={SaveOutlined}
                    tooltip={
                      SUBCATEGORY_RECOMMENDATIONS_LABELS.saveRowAriaLabel
                    }
                    color="primary"
                    disabled={isSaving}
                    onClick={() => onSaveRow(rowIndex)}
                  />
                  <ActionIconButton
                    icon={CloseOutlined}
                    tooltip={
                      SUBCATEGORY_RECOMMENDATIONS_LABELS.cancelRowAriaLabel
                    }
                    disabled={isSaving}
                    onClick={() => onCancelRow(rowIndex)}
                  />
                </>
              )}
              {!isNew && !isDirty && (
                <ActionIconButton
                  icon={DeleteOutlined}
                  tooltip={SUBCATEGORY_RECOMMENDATIONS_LABELS.deleteRow}
                  disabled={isSaving}
                  onClick={() => onDeleteRow(rowIndex)}
                />
              )}
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
      onDeleteRow,
      onSaveRow,
      onCancelRow,
      isRowDirty,
      savingRowId,
      invalidRowIds,
    ]
  );
};
