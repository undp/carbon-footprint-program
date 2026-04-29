import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useBlocker } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { MethodologyVersionStatus } from "@repo/types";
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
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { AppHttpError } from "@/api/http/errors";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { MethodologyStatusChip } from "../components/MethodologyStatusChip";
import { SubcategoryTransferListDialog } from "../components/SubcategoryTransferListDialog";
import type { SubcategoryOption } from "../components/SubcategoryTransferListDialog";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { SUBCATEGORY_RECOMMENDATIONS_LABELS } from "../constants";
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

type EditedRowEntry = {
  subcategoryIds: string[];
};

const arraysEqualUnordered = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
};

export const SubcategoryRecommendationsMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: methodologies,
    isLoading: isLoadingMethodologies,
    isError: isErrorMethodologies,
  } = useMethodologies();

  const defaultMethodologyId = useMemo(() => {
    if (!methodologies || methodologies.length === 0) return undefined;
    const published = methodologies.find(
      (m) => m.status === MethodologyVersionStatus.PUBLISHED
    );
    return published?.id ?? methodologies[0].id;
  }, [methodologies]);

  const [methodologyOverride, setMethodologyOverride] = useState<
    string | undefined
  >(undefined);
  const selectedMethodologyId = methodologyOverride ?? defaultMethodologyId;

  const {
    data: groups,
    isLoading: isLoadingGroups,
    isError: isErrorGroups,
  } = useSubcategoryRecommendations(selectedMethodologyId);
  const {
    data: sectors,
    isLoading: isLoadingSectors,
    isError: isErrorSectors,
  } = useCountrySectors();
  const {
    data: methodology,
    isLoading: isLoadingMethodology,
    isError: isErrorMethodology,
  } = useGetMethodologyById(selectedMethodologyId);
  const createMutation = useCreateSubcategoryRecommendation();
  const updateMutation = useUpdateSubcategoryRecommendation();

  const [tempRows, setTempRows] = useState<SubcategoryRecommendationRow[]>([]);
  const [editedRows, setEditedRows] = useState<Map<string, EditedRowEntry>>(
    () => new Map()
  );
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState<{
    rowId: string;
  } | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [pendingMethodologyId, setPendingMethodologyId] = useState<
    string | null
  >(null);
  const [invalidRowIds, setInvalidRowIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const clearInvalidRow = useCallback((rowId: string) => {
    setInvalidRowIds((prev) => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  }, []);

  // Reset transient state when methodology changes
  useEffect(() => {
    setTempRows([]);
    setEditedRows(new Map());
    setEditingRowId(null);
    setConfirmEmpty(null);
    setInvalidRowIds(new Set());
  }, [selectedMethodologyId]);

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

  const persistedRowsById = useMemo(
    () => new Map(persistedRows.map((r) => [r.id, r])),
    [persistedRows]
  );

  const rows = useMemo<SubcategoryRecommendationRow[]>(() => {
    const decoratedPersisted = persistedRows.map((r) => {
      const edit = editedRows.get(r.id);
      if (!edit) return r;
      return { ...r, subcategoryIds: edit.subcategoryIds };
    });
    return [...tempRows, ...decoratedPersisted];
  }, [tempRows, persistedRows, editedRows]);

  const isRowDirty = useCallback(
    (rowId: string): boolean => {
      if (isNewRow(rowId)) return true;
      const persisted = persistedRowsById.get(rowId);
      const edit = editedRows.get(rowId);
      if (!persisted || !edit) return false;
      return !arraysEqualUnordered(
        persisted.subcategoryIds,
        edit.subcategoryIds
      );
    },
    [persistedRowsById, editedRows]
  );

  const isDirty = useMemo(() => {
    if (tempRows.length > 0) return true;
    for (const id of editedRows.keys()) {
      if (isRowDirty(id)) return true;
    }
    return false;
  }, [tempRows, editedRows, isRowDirty]);

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
    if (tempRows.length > 0) return;
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
  }, [tempRows.length]);

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
      if (sectorId) clearInvalidRow(row.id);
    },
    [rows, sectors, clearInvalidRow]
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
      if (isNewRow(row.id) && !row.sectorId) return;
      setEditingRowId(row.id);
    },
    [rows]
  );

  const currentEditingRow = useMemo(
    () => rows.find((r) => r.id === editingRowId) ?? null,
    [rows, editingRowId]
  );

  const handleSaveSelection = useCallback(
    (selectedIds: string[]) => {
      if (!editingRowId || !currentEditingRow) return;

      if (isNewRow(editingRowId)) {
        setTempRows((prev) =>
          prev.map((r) =>
            r.id === editingRowId ? { ...r, subcategoryIds: selectedIds } : r
          )
        );
      } else {
        setEditedRows((prev) => {
          const next = new Map(prev);
          next.set(editingRowId, { subcategoryIds: selectedIds });
          return next;
        });
      }
      if (selectedIds.length > 0) clearInvalidRow(editingRowId);
      setEditingRowId(null);
    },
    [editingRowId, currentEditingRow, clearInvalidRow]
  );

  const runCreate = useCallback(
    async (row: SubcategoryRecommendationRow) => {
      if (!selectedMethodologyId) return;
      try {
        setSavingRowId(row.id);
        await createMutation.mutateAsync({
          methodologyId: selectedMethodologyId,
          sectorId: row.sectorId,
          subsectorId: row.subsectorId,
          subcategoryIds: row.subcategoryIds,
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
      } finally {
        setSavingRowId(null);
      }
    },
    [createMutation, enqueueSnackbar, selectedMethodologyId]
  );

  const runUpdate = useCallback(
    async (row: SubcategoryRecommendationRow, selectedIds: string[]) => {
      if (!selectedMethodologyId) return;
      try {
        setSavingRowId(row.id);
        await updateMutation.mutateAsync({
          methodologyId: selectedMethodologyId,
          sectorId: row.sectorId,
          subsectorId: row.subsectorId,
          subcategoryIds: selectedIds,
        });
        setEditedRows((prev) => {
          const next = new Map(prev);
          next.delete(row.id);
          return next;
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
      } finally {
        setSavingRowId(null);
      }
    },
    [updateMutation, enqueueSnackbar, selectedMethodologyId]
  );

  const handleSaveRow = useCallback(
    async (rowIndex: number) => {
      const row = rows[rowIndex];
      if (!row) return;

      if (isNewRow(row.id)) {
        if (!row.sectorId || row.subcategoryIds.length === 0) {
          setInvalidRowIds((prev) => {
            const next = new Set(prev);
            next.add(row.id);
            return next;
          });
          return;
        }
        clearInvalidRow(row.id);
        await runCreate(row);
        return;
      }

      const edit = editedRows.get(row.id);
      const ids = edit?.subcategoryIds ?? row.subcategoryIds;
      if (ids.length === 0) {
        setConfirmEmpty({ rowId: row.id });
        return;
      }
      await runUpdate(row, ids);
    },
    [rows, editedRows, runCreate, runUpdate, clearInvalidRow]
  );

  const handleCancelRow = useCallback(
    (rowIndex: number) => {
      const row = rows[rowIndex];
      if (!row) return;
      clearInvalidRow(row.id);
      if (isNewRow(row.id)) {
        setTempRows((prev) => prev.filter((r) => r.id !== row.id));
        return;
      }
      setEditedRows((prev) => {
        const next = new Map(prev);
        next.delete(row.id);
        return next;
      });
    },
    [rows, clearInvalidRow]
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
    nullSubsectorLabel: SUBCATEGORY_RECOMMENDATIONS_LABELS.nullSubsectorLabel,
    onChangeSector: handleChangeSector,
    onChangeSubsector: handleChangeSubsector,
    onOpenEdit: handleOpenEdit,
    onSaveRow: handleSaveRow,
    onCancelRow: handleCancelRow,
    isRowDirty,
    savingRowId,
    rows,
    invalidRowIds,
  });

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: isDirty,
    withResolver: true,
  });

  const handleMethodologyChange = useCallback(
    (newId: string) => {
      if (newId === selectedMethodologyId) return;
      if (isDirty) {
        setPendingMethodologyId(newId);
        return;
      }
      setMethodologyOverride(newId);
    },
    [selectedMethodologyId, isDirty]
  );

  const confirmMethodologyChange = useCallback(() => {
    if (!pendingMethodologyId) return;
    setTempRows([]);
    setEditedRows(new Map());
    setEditingRowId(null);
    setConfirmEmpty(null);
    setMethodologyOverride(pendingMethodologyId);
    setPendingMethodologyId(null);
  }, [pendingMethodologyId]);

  const isLoading =
    isLoadingGroups ||
    isLoadingSectors ||
    isLoadingMethodologies ||
    isLoadingMethodology;

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
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          {SUBCATEGORY_RECOMMENDATIONS_LABELS.title}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControl sx={{ minHeight: 40, minWidth: 240 }} size="small">
            <InputLabel id="methodology-select-label">
              {SUBCATEGORY_RECOMMENDATIONS_LABELS.methodologyLabel}
            </InputLabel>
            <Select
              labelId="methodology-select-label"
              label={SUBCATEGORY_RECOMMENDATIONS_LABELS.methodologyLabel}
              value={selectedMethodologyId ?? ""}
              onChange={(e) => handleMethodologyChange(e.target.value)}
              disabled={!methodologies || methodologies.length === 0}
            >
              {(methodologies ?? []).map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "100%",
                    }}
                  >
                    <span>{m.name}</span>
                    <MethodologyStatusChip status={m.status} />
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            disabled={tempRows.length > 0 || !selectedMethodologyId}
          >
            {SUBCATEGORY_RECOMMENDATIONS_LABELS.addRecommendation}
          </Button>
        </Box>
      </Box>
      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No fue posible cargar la información.
        </Alert>
      )}
      <Box className="rounded-sm bg-white p-3">
        <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
          {SUBCATEGORY_RECOMMENDATIONS_LABELS.description}
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
        open={editingRowId !== null && currentEditingRow !== null}
        isNew={editingRowId !== null && isNewRow(editingRowId)}
        availableSubcategories={subcategoryOptions}
        initialSelectedIds={currentEditingRow?.subcategoryIds ?? []}
        sectorName={currentEditingRow?.sectorName ?? ""}
        subsectorName={currentEditingRow?.subsectorName ?? null}
        nullSubsectorLabel={
          SUBCATEGORY_RECOMMENDATIONS_LABELS.nullSubsectorLabel
        }
        onClose={() => setEditingRowId(null)}
        onSave={handleSaveSelection}
      />
      <Dialog
        open={confirmEmpty !== null}
        onClose={() => setConfirmEmpty(null)}
      >
        <DialogTitle>
          {SUBCATEGORY_RECOMMENDATIONS_LABELS.emptyConfirmTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {SUBCATEGORY_RECOMMENDATIONS_LABELS.emptyConfirmBody}
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
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
      <UnsavedChangesDialog
        open={pendingMethodologyId !== null}
        onCancel={() => setPendingMethodologyId(null)}
        onConfirm={confirmMethodologyChange}
      />
    </>
  );
};
