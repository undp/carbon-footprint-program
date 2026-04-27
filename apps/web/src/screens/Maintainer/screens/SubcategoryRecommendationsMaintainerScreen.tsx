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
} from "@repo/types";
import {
  useSubcategoryRecommendations,
  useCreateSubcategoryRecommendation,
  useUpdateSubcategoryRecommendation,
} from "@/api/query/subcategoryRecommendations";
import { useCountrySectors } from "@/api/query/countrySectors";
import {
  useGetMethodologyById,
  useMethodologies,
} from "@/api/query/maintainer";
import { useSystemParameters } from "@/api/query/systemParameters/useSystemParameters";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { AppHttpError } from "@/api/http/errors";
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
  buildRowId,
  findSectorAndSubsectorNames,
} from "./SubcategoryRecommendationsMaintainerScreen.helpers";

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
    data: methodologies,
    isLoading: isLoadingMethodologies,
    isError: isErrorMethodologies,
  } = useMethodologies();
  // Use the first methodology to source category/subcategory options.
  // TODO: revisit if multiple methodologies need to be supported here.
  const defaultMethodologyId = methodologies?.[0]?.id;
  const {
    data: methodology,
    isLoading: isLoadingMethodology,
    isError: isErrorMethodology,
  } = useGetMethodologyById(defaultMethodologyId);
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
      ? "Sin subsector especificado"
      : "Todos los subsectores";

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
      (methodology?.categories ?? []).flatMap((category) =>
        category.subcategories.map((subcategory) => ({
          id: subcategory.id,
          name: subcategory.name,
          categoryId: category.id,
          categoryName: category.name,
        }))
      ),
    [methodology]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `${TEMP_ROW_PREFIX}${Date.now()}`;
    setTempRows((prev) => [
      {
        id: tempId,
        sectorId: "",
        subsectorId: null,
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
            subsectorId: null,
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
        // 409 surfaces as a feature-specific Spanish message because the
        // global handler emits a generic DATABASE_UNIQUE_CONSTRAINT code
        // that can apply to any module.
        const isConflict =
          error instanceof AppHttpError && error.detail.status === 409;
        const message = isConflict
          ? "Ya existe una recomendación para este sector y subsector. Edítala en lugar de crear una nueva."
          : getApiErrorMessage(error, "Error al crear la recomendación");
        void enqueueSnackbar({ message, variant: "error" });
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
    if (!row) {
      void enqueueSnackbar({
        message:
          "La recomendación ya no existe. La lista se actualizó en otra ventana.",
        variant: "warning",
      });
      setConfirmEmpty(null);
      return;
    }
    await runUpdate(row, []);
    setConfirmEmpty(null);
  }, [confirmEmpty, rows, runUpdate, enqueueSnackbar]);

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
    isLoadingMethodologies ||
    isLoadingMethodology ||
    isLoadingParams;

  const hasError =
    isErrorGroups ||
    isErrorSectors ||
    isErrorMethodologies ||
    isErrorMethodology;

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
          Recomendaciones de Subcategorías
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddRow}
        >
          Agregar recomendación
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
          ¿Eliminar todas las recomendaciones de este grupo?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Al guardar sin subcategorías, todas las recomendaciones de este
            grupo serán eliminadas.
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
