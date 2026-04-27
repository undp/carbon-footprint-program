import { FC, useCallback, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { Box } from "@mui/material";
import { useGridApiRef } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import { uniqBy } from "lodash-es";
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
import { useMaintainerFormSync } from "../hooks/useMaintainerFormSync";
import {
  useReductionPlanInitiativesForm,
  toFormReductionPlanInitiative,
  type ReductionPlanInitiativeFormRow,
} from "../hooks/useReductionPlanInitiativesForm";
import { useReductionPlanInitiativeColumns } from "../hooks/useReductionPlanInitiativeColumns";

const isNewRow = (id: string) => id.startsWith("temp_");

export const ReductionPlanInitiativesMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { data: reductionPlanInitiatives, isLoading } =
    useReductionPlanInitiatives();

  const { data: methodologies = [] } = useMethodologies();

  const activeMethodologyVersionId = useMemo(
    () =>
      methodologies.find((m) => m.status === MethodologyVersionStatus.PUBLISHED)
        ?.id,
    [methodologies]
  );
  const { data: subcategoriesData = [] } = useSubcategories(
    activeMethodologyVersionId
  );

  const subcategories = useMemo(
    () =>
      subcategoriesData.map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: s.category.id,
      })),
    [subcategoriesData]
  );
  const categories = useMemo(
    () =>
      uniqBy(
        subcategoriesData.map((s) => ({
          id: s.category.id,
          name: s.category.name,
        })),
        "id"
      ),
    [subcategoriesData]
  );

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const apiRef = useGridApiRef();

  const createMutation = useAddReductionPlanInitiative();
  const updateMutation = useUpdateReductionPlanInitiative();
  const deleteMutation = useDeleteReductionPlanInitiative();

  const { form, fieldArray, handleCellChange } =
    useReductionPlanInitiativesForm();
  const currentRows = form.watch("reductionPlanInitiatives");

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
    methodologyVersionId: undefined,
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
      categoryId: "",
    };
    const currentCount = form.getValues("reductionPlanInitiatives").length;
    const newRowIndex = currentCount;
    const lastPage = Math.max(
      0,
      Math.ceil((currentCount + 1) / paginationModel.pageSize) - 1
    );
    fieldArray.append(newRow);
    setPaginationModel((prev) => ({ ...prev, page: lastPage }));
    setEditingRowId(tempId);
    setNewRowId(tempId);
    // Scroll the grid to the freshly appended row on the next frame so it's
    // visible before the autoFocused input triggers a scrollIntoView.
    requestAnimationFrame(() => {
      apiRef.current?.scrollToIndexes({ rowIndex: newRowIndex });
    });
  }, [fieldArray, form, paginationModel.pageSize, apiRef]);

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

  const handleCategoryChange = useCallback(
    (rowIndex: number, categoryId: string) => {
      const previousCategoryId = form.getValues(
        `reductionPlanInitiatives.${rowIndex}.categoryId`
      );
      handleCellChange(rowIndex, "categoryId", categoryId);
      if (previousCategoryId !== categoryId) {
        const currentSubcategoryId = form.getValues(
          `reductionPlanInitiatives.${rowIndex}.subcategoryId`
        );
        if (currentSubcategoryId) {
          handleCellChange(rowIndex, "subcategoryId", "");
        }
      }
    },
    [form, handleCellChange]
  );

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
    onCategoryChange: handleCategoryChange,
    rows: currentRows,
    categories,
    subcategories,
  });

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Iniciativas para planes de reducción"
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
        showDownload={false}
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
    </FormProvider>
  );
};
