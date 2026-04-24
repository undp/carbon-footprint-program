import { FC, useCallback, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "notistack";
import {
  SubcategoryRecommendationModeEnum,
  SystemParameterKeyEnum,
  type GetAllCountrySectorsResponse,
} from "@repo/types";
import {
  useSubcategoryRecommendations,
  useCreateSubcategoryRecommendation,
  useUpdateSubcategoryRecommendation,
  useAllSubcategories,
} from "@/api/query/subcategoryRecommendations";
import { useCountrySectors } from "@/api/query/countrySectors";
import { useSystemParameters } from "@/api/query/systemParameters/useSystemParameters";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import {
  SubcategoryTransferListDialog,
  type SubcategoryOption,
} from "../components/SubcategoryTransferListDialog";
import { useSubcategoryRecommendationColumns } from "../hooks/useSubcategoryRecommendationColumns";
import {
  isNewRow,
  TEMP_ROW_PREFIX,
  type SubcategoryRecommendationRow,
} from "../hooks/useSubcategoryRecommendationsForm";
import {
  ALL_SUBSECTORS_VALUE,
  SUBCATEGORY_RECOMMENDATIONS_LABELS,
} from "../constants";

const buildRowId = (sectorId: string, subsectorId: string | null): string =>
  `${sectorId}-${subsectorId ?? "null"}`;

const findSectorAndSubsectorNames = (
  sectors: GetAllCountrySectorsResponse,
  sectorId: string,
  subsectorId: string | null
) => {
  const sector = sectors.find((s) => s.id === sectorId);
  const subsector =
    subsectorId !== null
      ? (sector?.subsectors.find((sub) => sub.id === subsectorId) ?? null)
      : null;
  return {
    sectorName: sector?.name ?? "",
    subsectorName: subsector?.name ?? null,
  };
};

export const SubcategoryRecommendationsMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    data: groups,
    isLoading: isLoadingGroups,
    isError: isErrorGroups,
  } = useSubcategoryRecommendations();
  const {
    data: sectors,
    isLoading: isLoadingSectors,
    isError: isErrorSectors,
  } = useCountrySectors();
  const {
    data: allSubcategories,
    isLoading: isLoadingSubcategories,
    isError: isErrorSubcategories,
  } = useAllSubcategories();
  const { data: systemParameters, isLoading: isLoadingParams } =
    useSystemParameters([
      SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE,
    ]);

  const createMutation = useCreateSubcategoryRecommendation();
  const updateMutation = useUpdateSubcategoryRecommendation();

  const [tempRows, setTempRows] = useState<SubcategoryRecommendationRow[]>([]);
  const [editingState, setEditingState] = useState<{
    rowId: string;
    isNew: boolean;
  } | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState<{
    rowId: string;
    sectorId: string;
    subsectorId: string | null;
  } | null>(null);

  const recommendationMode = useMemo(() => {
    const entry = systemParameters?.find(
      (p) => p.key === SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE
    );
    return entry?.value ?? SubcategoryRecommendationModeEnum.UNION;
  }, [systemParameters]);

  const nullSubsectorLabel =
    recommendationMode === SubcategoryRecommendationModeEnum.SPECIFIC
      ? SUBCATEGORY_RECOMMENDATIONS_LABELS.noSubsectorSpecified
      : SUBCATEGORY_RECOMMENDATIONS_LABELS.allSubsectors;

  const persistedRows = useMemo<SubcategoryRecommendationRow[]>(
    () =>
      (groups ?? []).map((g) => ({
        id: buildRowId(g.sectorId, g.subsectorId),
        sectorId: g.sectorId,
        subsectorId: g.subsectorId,
        sectorName: g.sectorName,
        subsectorName: g.subsectorName,
        subcategoryIds: g.subcategoryIds,
      })),
    [groups]
  );

  // Derive rows while filtering out any temp row whose (sector, subsector) pair
  // matches an already-persisted row — avoids showing duplicates after a
  // successful POST invalidates the list query.
  const rows = useMemo(() => {
    const persistedIds = new Set(persistedRows.map((r) => r.id));
    const visibleTempRows = tempRows.filter((r) => {
      if (!r.sectorId) return true;
      return !persistedIds.has(buildRowId(r.sectorId, r.subsectorId));
    });
    return [...visibleTempRows, ...persistedRows];
  }, [tempRows, persistedRows]);

  const subcategoryOptions = useMemo<SubcategoryOption[]>(
    () =>
      (allSubcategories ?? []).map((sc) => ({
        id: sc.id,
        name: sc.name,
        categoryId: sc.category.id,
        categoryName: sc.category.name,
      })),
    [allSubcategories]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `${TEMP_ROW_PREFIX}${Date.now()}`;
    setTempRows((prev) => [
      {
        id: tempId,
        sectorId: "",
        subsectorId: ALL_SUBSECTORS_VALUE,
        sectorName: "",
        subsectorName: null,
        subcategoryIds: [],
      },
      ...prev,
    ]);
  }, []);

  const handleRemoveTempRow = useCallback(
    (rowIndex: number) => {
      const row = rows[rowIndex];
      if (!row || !isNewRow(row.id)) return;
      setTempRows((prev) => prev.filter((r) => r.id !== row.id));
    },
    [rows]
  );

  const handleChangeSector = useCallback(
    (rowIndex: number, sectorId: string) => {
      const row = rows[rowIndex];
      if (!row || !isNewRow(row.id)) return;
      setTempRows((prev) =>
        prev.map((r) => {
          if (r.id !== row.id) return r;
          const { sectorName } = findSectorAndSubsectorNames(
            sectors ?? [],
            sectorId,
            null
          );
          return {
            ...r,
            sectorId,
            sectorName,
            subsectorId: ALL_SUBSECTORS_VALUE,
            subsectorName: null,
          };
        })
      );
    },
    [rows, sectors]
  );

  const handleChangeSubsector = useCallback(
    (rowIndex: number, subsectorId: string | null) => {
      const row = rows[rowIndex];
      if (!row || !isNewRow(row.id)) return;
      setTempRows((prev) =>
        prev.map((r) => {
          if (r.id !== row.id) return r;
          const { subsectorName } = findSectorAndSubsectorNames(
            sectors ?? [],
            r.sectorId,
            subsectorId
          );
          return {
            ...r,
            subsectorId,
            subsectorName,
          };
        })
      );
    },
    [rows, sectors]
  );

  const handleOpenEdit = useCallback(
    (rowIndex: number) => {
      const row = rows[rowIndex];
      if (!row) return;
      if (isNewRow(row.id) && !row.sectorId) {
        void enqueueSnackbar({
          message: "Selecciona un sector antes de elegir subcategorías",
          variant: "warning",
        });
        return;
      }
      setEditingState({ rowId: row.id, isNew: isNewRow(row.id) });
    },
    [rows, enqueueSnackbar]
  );

  const currentEditingRow = useMemo(
    () => rows.find((r) => r.id === editingState?.rowId) ?? null,
    [rows, editingState]
  );

  const runCreate = useCallback(
    async (row: SubcategoryRecommendationRow, selectedIds: string[]) => {
      try {
        await createMutation.mutateAsync({
          sectorId: row.sectorId,
          subsectorId: row.subsectorId,
          subcategoryIds: selectedIds,
        });
        setTempRows((prev) => prev.filter((r) => r.id !== row.id));
        void enqueueSnackbar({
          message: "Recomendación creada exitosamente",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear la recomendación"),
          variant: "error",
        });
      }
    },
    [createMutation, enqueueSnackbar]
  );

  const runUpdate = useCallback(
    async (row: SubcategoryRecommendationRow, selectedIds: string[]) => {
      try {
        await updateMutation.mutateAsync({
          query: {
            sectorId: Number(row.sectorId),
            subsectorId:
              row.subsectorId !== null ? Number(row.subsectorId) : null,
          },
          body: { subcategoryIds: selectedIds },
        });
        void enqueueSnackbar({
          message: "Recomendación actualizada",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(
            error,
            "Error al actualizar la recomendación"
          ),
          variant: "error",
        });
      }
    },
    [updateMutation, enqueueSnackbar]
  );

  const handleSaveSelection = useCallback(
    async (selectedIds: string[]) => {
      if (!editingState || !currentEditingRow) return;

      if (editingState.isNew) {
        if (selectedIds.length === 0) {
          // Guard — transfer list disables save in this case, but the guard
          // here prevents accidental empty POST.
          return;
        }
        await runCreate(currentEditingRow, selectedIds);
        setEditingState(null);
        return;
      }

      if (selectedIds.length === 0) {
        setEditingState(null);
        setConfirmEmpty({
          rowId: currentEditingRow.id,
          sectorId: currentEditingRow.sectorId,
          subsectorId: currentEditingRow.subsectorId,
        });
        return;
      }

      await runUpdate(currentEditingRow, selectedIds);
      setEditingState(null);
    },
    [editingState, currentEditingRow, runCreate, runUpdate]
  );

  const handleConfirmEmptyDelete = useCallback(async () => {
    if (!confirmEmpty) return;
    const row = rows.find((r) => r.id === confirmEmpty.rowId);
    if (row) {
      await runUpdate(row, []);
    }
    setConfirmEmpty(null);
  }, [confirmEmpty, rows, runUpdate]);

  const columns = useSubcategoryRecommendationColumns({
    sectors: sectors ?? [],
    subcategories: subcategoryOptions,
    nullSubsectorLabel,
    onChangeSector: handleChangeSector,
    onChangeSubsector: handleChangeSubsector,
    onOpenEdit: handleOpenEdit,
    onRemoveTempRow: handleRemoveTempRow,
    rows,
  });

  const isLoading =
    isLoadingGroups ||
    isLoadingSectors ||
    isLoadingSubcategories ||
    isLoadingParams;

  const hasError = isErrorGroups || isErrorSectors || isErrorSubcategories;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          {SUBCATEGORY_RECOMMENDATIONS_LABELS.screenTitle}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
        >
          {SUBCATEGORY_RECOMMENDATIONS_LABELS.addRow}
        </Button>
      </Box>
      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No fue posible cargar la información.
        </Alert>
      )}
      <Box className="rounded-sm bg-white p-3">
        <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
          Gestiona qué subcategorías se pre-seleccionan al crear inventarios
          según el sector y subsector de la organización.
        </Typography>
        <MaintainerDataGrid
          editingRowId={null}
          loading={isLoading}
          columns={columns}
          rows={rows}
          getRowId={(row: SubcategoryRecommendationRow) => row.id}
          disableRowSelectionOnClick
          rowHeight={72}
        />
      </Box>
      <SubcategoryTransferListDialog
        open={editingState !== null && currentEditingRow !== null}
        isNew={editingState?.isNew ?? false}
        availableSubcategories={subcategoryOptions}
        initialSelectedIds={currentEditingRow?.subcategoryIds ?? []}
        onClose={() => setEditingState(null)}
        onSave={handleSaveSelection}
      />
      <Dialog
        open={confirmEmpty !== null}
        onClose={() => setConfirmEmpty(null)}
      >
        <DialogTitle>
          {SUBCATEGORY_RECOMMENDATIONS_LABELS.emptyGroupConfirmTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {SUBCATEGORY_RECOMMENDATIONS_LABELS.emptyGroupConfirmBody}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEmpty(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmEmptyDelete}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
