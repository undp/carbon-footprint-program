import { FC, useCallback, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useGridApiRef } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import { MethodologyVersionStatus } from "@repo/types";
import {
  useReductionPlanInitiatives,
  useAddReductionPlanInitiative,
  useUpdateReductionPlanInitiative,
  useDeleteReductionPlanInitiative,
  useMethodologies,
  useSubcategories,
} from "@/api/query/maintainer";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { MethodologyStatusChip } from "../components/MethodologyStatusChip";
import { useMaintainerFormSync } from "../hooks/useMaintainerFormSync";
import {
  useReductionPlanInitiativesForm,
  toFormReductionPlanInitiative,
  type ReductionPlanInitiativeFormRow,
} from "../hooks/useReductionPlanInitiativesForm";
import { useReductionPlanInitiativeColumns } from "../hooks/useReductionPlanInitiativeColumns";

const isNewRow = (id: string) => id.startsWith("temp_");

export const ReductionPlanInitiativesMaintainerScreen: FC = () => {
  // UI hooks
  const { enqueueSnackbar } = useSnackbar();
  const apiRef = useGridApiRef();

  // Local state hooks
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [
    explicitlySelectedMethodologyVersionId,
    setExplicitlySelectedMethodologyVersionId,
  ] = useState<string | undefined>(undefined);
  const [pendingMethodologyVersionId, setPendingMethodologyVersionId] =
    useState<string | null>(null);

  // Form hooks
  const { form, fieldArray, handleCellChange } =
    useReductionPlanInitiativesForm();
  const currentRows = form.watch("reductionPlanInitiatives");

  // Data query hooks
  const { data: methodologies = [] } = useMethodologies();

  // Default selection derived from data: PUBLISHED methodology unless the user
  // has explicitly picked another one.
  const selectedMethodologyVersionId = useMemo(() => {
    if (explicitlySelectedMethodologyVersionId)
      return explicitlySelectedMethodologyVersionId;
    return methodologies.find(
      (m) => m.status === MethodologyVersionStatus.PUBLISHED
    )?.id;
  }, [explicitlySelectedMethodologyVersionId, methodologies]);

  const { data: reductionPlanInitiatives, isLoading } =
    useReductionPlanInitiatives(selectedMethodologyVersionId);
  const { data: subcategoriesData = [] } = useSubcategories(
    selectedMethodologyVersionId
  );

  // Data mutation hooks
  const createMutation = useAddReductionPlanInitiative();
  const updateMutation = useUpdateReductionPlanInitiative();
  const deleteMutation = useDeleteReductionPlanInitiative();

  const subcategoryOptions = useMemo(
    () =>
      [...subcategoriesData]
        .map((s) => ({
          id: s.id,
          name: s.name,
          categoryName: s.category.name,
        }))
        .sort(
          (a, b) =>
            a.categoryName.localeCompare(b.categoryName) ||
            a.name.localeCompare(b.name)
        ),
    [subcategoriesData]
  );

  const toFormData = useCallback(
    (data: unknown[]) =>
      (data as NonNullable<typeof reductionPlanInitiatives>).map(
        toFormReductionPlanInitiative
      ),
    []
  );
  useMaintainerFormSync({
    form,
    fieldName: "reductionPlanInitiatives",
    editingRowId,
    methodologyVersionId: selectedMethodologyVersionId,
    serverData: reductionPlanInitiatives,
    toFormData,
  });

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("reductionPlanInitiatives");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];
    if (!row) {
      setEditingRowId(null);
      setNewRowId(null);
      return true;
    }

    const isValid = await form.trigger(`reductionPlanInitiatives.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (isNewRow(row.id)) {
      try {
        const result = await createMutation.mutateAsync({
          title: row.title,
          description: row.description,
          subcategoryId: row.subcategoryId,
        });
        fieldArray.update(rowIndex, { ...row, id: result.id });
        form.reset({
          reductionPlanInitiatives: form.getValues("reductionPlanInitiatives"),
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear iniciativa"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      setNewRowId(null);
      return true;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.reductionPlanInitiatives?.[rowIndex];

    try {
      if (isRowDirty) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: {
            title: row.title,
            description: row.description,
            subcategoryId: row.subcategoryId,
          },
        });
        form.reset({
          reductionPlanInitiatives: form.getValues("reductionPlanInitiatives"),
        });
      }
    } catch (error) {
      void enqueueSnackbar({
        message: getApiErrorMessage(error, "Error al guardar cambios"),
        variant: "error",
      });
      return false;
    }
    setEditingRowId(null);
    setNewRowId(null);
    return true;
  }, [
    editingRowId,
    form,
    fieldArray,
    createMutation,
    updateMutation,
    enqueueSnackbar,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("reductionPlanInitiatives");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = reductionPlanInitiatives?.find(
        ({ id }) => id === editingRowId
      );
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormReductionPlanInitiative(original));
      }
    }

    form.reset({
      reductionPlanInitiatives: form.getValues("reductionPlanInitiatives"),
    });
    setEditingRowId(null);
    setNewRowId(null);
  }, [editingRowId, form, fieldArray, reductionPlanInitiatives]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) {
        const ok = await handleStopEditRow();
        if (!ok) return;
      }
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const newRow: ReductionPlanInitiativeFormRow = {
      id: tempId,
      title: "",
      description: "",
      subcategoryId: "",
    };
    fieldArray.prepend(newRow);
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
    setEditingRowId(tempId);
    setNewRowId(tempId);
    requestAnimationFrame(() => {
      apiRef.current?.scrollToIndexes({ rowIndex: 0 });
    });
  }, [fieldArray, apiRef]);

  const handleDelete = useCallback(
    async (row: ReductionPlanInitiativeFormRow) => {
      try {
        const rows = form.getValues("reductionPlanInitiatives");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index === -1) return;
        if (editingRowId === row.id) setEditingRowId(null);
        if (!isNewRow(row.id)) {
          await deleteMutation.mutateAsync(row.id);
        }
        fieldArray.remove(index);
        form.reset({
          reductionPlanInitiatives: form.getValues("reductionPlanInitiatives"),
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar iniciativa"),
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, deleteMutation, enqueueSnackbar]
  );

  const applyMethodologyChange = useCallback(
    (id: string) => {
      if (editingRowId) handleCancelEditRow();
      form.reset({ reductionPlanInitiatives: [] });
      setExplicitlySelectedMethodologyVersionId(id);
    },
    [editingRowId, handleCancelEditRow, form]
  );

  const handleMethodologyChange = useCallback(
    (id: string) => {
      if (id === selectedMethodologyVersionId) return;
      const hasUnsavedWork = form.formState.isDirty || editingRowId !== null;
      if (hasUnsavedWork) {
        setPendingMethodologyVersionId(id);
        return;
      }
      applyMethodologyChange(id);
    },
    [
      selectedMethodologyVersionId,
      form.formState.isDirty,
      editingRowId,
      applyMethodologyChange,
    ]
  );

  const handleConfirmMethodologyChange = useCallback(() => {
    if (!pendingMethodologyVersionId) return;
    applyMethodologyChange(pendingMethodologyVersionId);
    setPendingMethodologyVersionId(null);
  }, [pendingMethodologyVersionId, applyMethodologyChange]);

  const handleCancelMethodologyChange = useCallback(() => {
    setPendingMethodologyVersionId(null);
  }, []);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  const columns = useReductionPlanInitiativeColumns({
    editingRowId,
    newRowId,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    rows: currentRows,
    subcategories: subcategoryOptions,
  });

  const selectedMethodology = methodologies.find(
    (m) => m.id === selectedMethodologyVersionId
  );

  const methodologySelector = (
    <FormControl sx={{ minHeight: 40, minWidth: 280 }} size="small">
      <InputLabel id="methodology-select-label">Metodología</InputLabel>
      <Select
        labelId="methodology-select-label"
        label="Metodología"
        value={selectedMethodologyVersionId ?? ""}
        onChange={(e) => handleMethodologyChange(e.target.value)}
        renderValue={() =>
          selectedMethodology ? (
            <Box className="flex items-center gap-2">
              <span>{selectedMethodology.name}</span>
              <MethodologyStatusChip status={selectedMethodology.status} />
            </Box>
          ) : null
        }
      >
        {methodologies.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            <Box className="flex w-full items-center justify-between gap-2">
              <span>{m.name}</span>
              <MethodologyStatusChip status={m.status} />
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Iniciativas para planes de reducción"
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null || !selectedMethodologyVersionId}
        addLabel="Agregar fila"
        showDownload={false}
        extra={methodologySelector}
      />
      <Box className="rounded-sm bg-white p-3">
        <form id="reduction-plan-initiatives-form" noValidate>
          <Box className="flex w-full">
            <MaintainerDataGrid
              apiRef={apiRef}
              editingRowId={editingRowId}
              columns={columns}
              rows={currentRows}
              loading={isLoading}
              getRowHeight={() => "auto"}
              getRowId={(row: ReductionPlanInitiativeFormRow) => row.id}
              hideFooter={false}
              pagination={true}
              pageSizeOptions={[25, 50, 100]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
            />
          </Box>
        </form>
      </Box>
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
      <UnsavedChangesDialog
        open={pendingMethodologyVersionId !== null}
        onCancel={handleCancelMethodologyChange}
        onConfirm={handleConfirmMethodologyChange}
      />
    </FormProvider>
  );
};
