import { FC, useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { FormProvider } from "react-hook-form";
import { useSnackbar } from "notistack";
import {
  useSubcategoryRecommendations,
  useCreateSubcategoryRecommendation,
  useUpdateSubcategoryRecommendation,
} from "@/api/query/subcategoryRecommendations";
import { useSystemParameters } from "@/api/query/systemParameters";
import { useCountrySectors } from "@/api/query";
import { SystemParameterKeyEnum } from "@repo/types";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { SubcategoryTransferListDialog } from "../components/SubcategoryTransferListDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  useSubcategoryRecommendationsForm,
  toFormRow,
  isNewRow,
  type SubcategoryRecommendationFormRow,
} from "../hooks/useSubcategoryRecommendationsForm";
import { useSubcategoryRecommendationColumns } from "../hooks/useSubcategoryRecommendationColumns";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";

interface TransferListState {
  open: boolean;
  rowId: string | null;
}

interface ConfirmDeleteState {
  open: boolean;
  rowId: string | null;
  pendingIds: number[];
}

export const SubcategoryRecommendationsMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const tempCounter = useRef(0);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [transferListState, setTransferListState] = useState<TransferListState>(
    { open: false, rowId: null }
  );
  const [confirmDeleteState, setConfirmDeleteState] =
    useState<ConfirmDeleteState>({
      open: false,
      rowId: null,
      pendingIds: [],
    });

  // --- Data fetching ---
  const {
    data: recommendations,
    isLoading,
    isError,
  } = useSubcategoryRecommendations();
  const { data: sectors } = useCountrySectors();
  const { data: systemParameters } = useSystemParameters([
    SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE,
  ]);

  const mode = systemParameters?.find(
    (p) => p.key === SystemParameterKeyEnum.SUBCATEGORY_RECOMMENDATION_MODE
  )?.value;

  // --- Mutations ---
  const createMutation = useCreateSubcategoryRecommendation();
  const updateMutation = useUpdateSubcategoryRecommendation();

  // --- Form ---
  const { form, fieldArray, handleCellChange } =
    useSubcategoryRecommendationsForm();
  const currentRows = form.watch("rows");

  // --- Sync form with server data ---
  useEffect(() => {
    if (!recommendations) return;
    if (editingRowId) return;
    const serverRows = recommendations.map(toFormRow);
    form.reset({ rows: serverRows });
  }, [recommendations, form, editingRowId]);

  // --- Transfer list handlers ---
  const handleOpenTransferList = useCallback(
    (rowId: string) => {
      if (!editingRowId || editingRowId === rowId) {
        setEditingRowId(rowId);
        setTransferListState({ open: true, rowId });
      }
    },
    [editingRowId]
  );

  const handleCloseTransferList = useCallback(() => {
    setTransferListState({ open: false, rowId: null });
  }, []);

  const handleTransferListSave = useCallback(
    async (subcategoryIds: number[]) => {
      const rowId = transferListState.rowId;
      if (!rowId) return;

      const rowIndex = currentRows.findIndex((r) => r.id === rowId);
      if (rowIndex === -1) return;

      const row = currentRows[rowIndex];

      handleCellChange(rowIndex, "subcategoryIds", subcategoryIds);
      setTransferListState({ open: false, rowId: null });

      if (isNewRow(rowId)) {
        // Keep editing until user stops the row
        return;
      }

      // For existing rows: if subcategoryIds is empty, show confirm dialog
      if (subcategoryIds.length === 0) {
        setConfirmDeleteState({
          open: true,
          rowId,
          pendingIds: [],
        });
        return;
      }

      // Submit update immediately
      try {
        await updateMutation.mutateAsync({
          sectorId: row.sectorId!,
          subsectorId: row.subsectorId,
          data: { subcategoryIds },
        });
        setEditingRowId(null);
        enqueueSnackbar({ message: "Cambios guardados", variant: "success" });
      } catch (error) {
        enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al guardar cambios"),
          variant: "error",
        });
      }
    },
    [
      transferListState.rowId,
      currentRows,
      handleCellChange,
      updateMutation,
      enqueueSnackbar,
    ]
  );

  const handleConfirmDelete = useCallback(async () => {
    const rowId = confirmDeleteState.rowId;
    if (!rowId) return;

    const row = currentRows.find((r) => r.id === rowId);
    if (!row) return;

    setConfirmDeleteState({ open: false, rowId: null, pendingIds: [] });

    try {
      await updateMutation.mutateAsync({
        sectorId: row.sectorId!,
        subsectorId: row.subsectorId,
        data: { subcategoryIds: [] },
      });
      setEditingRowId(null);
      enqueueSnackbar({
        message: "Recomendaciones eliminadas",
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar({
        message: getApiErrorMessage(error, "Error al eliminar recomendaciones"),
        variant: "error",
      });
    }
  }, [confirmDeleteState, currentRows, updateMutation, enqueueSnackbar]);

  // --- Row editing handlers ---
  const handleAddRow = useCallback(() => {
    const tempId = `temp-${++tempCounter.current}`;
    const newRow: SubcategoryRecommendationFormRow = {
      id: tempId,
      sectorId: null,
      subsectorId: null,
      sectorName: "",
      subsectorName: null,
      subcategoryIds: [],
    };
    fieldArray.prepend(newRow);
    setEditingRowId(tempId);
  }, [fieldArray]);

  const handleStartEditRow = useCallback(
    (rowId: string) => {
      if (!editingRowId) {
        setEditingRowId(rowId);
      }
    },
    [editingRowId]
  );

  const handleStopTempRow = useCallback(async () => {
    if (!editingRowId || !isNewRow(editingRowId)) return;

    const row = currentRows.find((r) => r.id === editingRowId);
    if (!row || !row.sectorId || row.subcategoryIds.length === 0) {
      enqueueSnackbar({
        message:
          "Selecciona un sector y al menos una subcategoría antes de guardar",
        variant: "error",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        sectorId: row.sectorId,
        subsectorId: row.subsectorId,
        subcategoryIds: row.subcategoryIds,
      });
      setEditingRowId(null);
      enqueueSnackbar({
        message: "Recomendación creada exitosamente",
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar({
        message: getApiErrorMessage(error, "Error al crear recomendación"),
        variant: "error",
      });
    }
  }, [editingRowId, currentRows, createMutation, enqueueSnackbar]);

  const handleCancelTempRow = useCallback(() => {
    if (!editingRowId) return;
    const rowIndex = currentRows.findIndex((r) => r.id === editingRowId);
    if (isNewRow(editingRowId) && rowIndex !== -1) {
      fieldArray.remove(rowIndex);
    }
    setEditingRowId(null);
  }, [editingRowId, currentRows, fieldArray]);

  // --- Sector/subsector change handlers for temp rows ---
  const handleSectorChange = useCallback(
    (rowIndex: number, sectorId: number | null) => {
      const sector = sectors?.find((s) => s.id === String(sectorId));
      handleCellChange(rowIndex, "sectorId", sectorId);
      handleCellChange(rowIndex, "sectorName", sector?.name ?? "");
      handleCellChange(rowIndex, "subsectorId", null);
      handleCellChange(rowIndex, "subsectorName", null);
    },
    [sectors, handleCellChange]
  );

  const handleSubsectorChange = useCallback(
    (rowIndex: number, subsectorId: number | null) => {
      const row = currentRows[rowIndex];
      const sector = sectors?.find((s) => s.id === String(row?.sectorId));
      const subsector = sector?.subsectors.find(
        (sub) => sub.id === String(subsectorId)
      );
      handleCellChange(rowIndex, "subsectorId", subsectorId);
      handleCellChange(rowIndex, "subsectorName", subsector?.name ?? null);
    },
    [currentRows, sectors, handleCellChange]
  );

  // --- Column definitions ---
  const columns = useSubcategoryRecommendationColumns({
    editingRowId,
    sectors: sectors ?? [],
    mode,
    onStartEditRow: handleStartEditRow,
    onOpenTransferList: handleOpenTransferList,
    onSectorChange: handleSectorChange,
    onSubsectorChange: handleSubsectorChange,
    onSaveNewRow: handleStopTempRow,
    onCancelNewRow: handleCancelTempRow,
    rows: currentRows,
  });

  const transferListRow = currentRows.find(
    (r) => r.id === transferListState.rowId
  );
  const isTransferListNew = transferListState.rowId
    ? isNewRow(transferListState.rowId)
    : false;

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title={SUBCATEGORY_RECOMMENDATIONS_LABELS.SCREEN_TITLE}
        addLabel={SUBCATEGORY_RECOMMENDATIONS_LABELS.ADD_ROW}
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null}
      />
      <Box className="rounded-sm bg-white p-3">
        {isError && (
          <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
            No fue posible cargar las recomendaciones de subcategorías.
          </Typography>
        )}
        <form id="subcategory-recommendations-form" noValidate>
          <Box className="flex w-full">
            <MaintainerDataGrid
              editingRowId={editingRowId}
              columns={columns}
              rows={currentRows}
              loading={isLoading}
              getRowId={(row: SubcategoryRecommendationFormRow) => row.id}
            />
          </Box>
        </form>
      </Box>

      <SubcategoryTransferListDialog
        key={
          transferListState.open
            ? (transferListState.rowId ?? "open")
            : "closed"
        }
        open={transferListState.open}
        isNew={isTransferListNew}
        selectedIds={transferListRow?.subcategoryIds ?? []}
        onSave={handleTransferListSave}
        onClose={handleCloseTransferList}
      />

      <ConfirmDialog
        open={confirmDeleteState.open}
        onClose={() =>
          setConfirmDeleteState({ open: false, rowId: null, pendingIds: [] })
        }
        onConfirm={() => void handleConfirmDelete()}
        title={SUBCATEGORY_RECOMMENDATIONS_LABELS.DELETE_GROUP_CONFIRM}
        message="Esta acción eliminará todas las subcategorías recomendadas para este grupo. El grupo desaparecerá de la lista."
        variant="warning"
        confirmLabel="Eliminar"
      />
    </FormProvider>
  );
};
