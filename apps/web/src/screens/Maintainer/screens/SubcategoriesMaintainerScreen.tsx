import { FC, useCallback, useEffect, useMemo } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import {
  useCategories,
  useSubcategories,
  useAddSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
} from "@/api/query/maintainer";
import { useMeasurementUnits } from "@/api/query";
import {
  useSubcategoriesForm,
  toFormSubcategory,
} from "../hooks/useSubcategoriesForm";
import { useSubcategoryColumns } from "../hooks/useSubcategoryColumns";
import { useMaintainerEditingState } from "../hooks/useMaintainerEditingState";
import { useMaintainerFormSync } from "../hooks/useMaintainerFormSync";
import { useMaintainerExitEditMode } from "../hooks/useMaintainerExitEditMode";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";
import { SubcategoryForm } from "@repo/types";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { MaintainerScreenLayout } from "../components/MaintainerScreenLayout";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { ExplanationModal } from "../components/ExplanationModal";

export const SubcategoriesMaintainerScreen: FC = () => {
  const scope = useMaintainerMethodologyScope();
  const { methodologyVersionId, isMethodologiesError } = scope;
  const { enqueueSnackbar } = useSnackbar();

  // --- Data fetching ---
  const {
    data: subcategories,
    isLoading: isLoadingSubcategories,
    isError: isErrorSubcategories,
  } = useSubcategories(methodologyVersionId);
  const { data: categories, isLoading: isLoadingCategories } =
    useCategories(methodologyVersionId);
  const { data: measurementUnits, isLoading: isLoadingUnits } =
    useMeasurementUnits();

  const categoryOptions = useMemo(
    () =>
      categories?.map((c) => ({ id: c.id, name: c.name, color: c.color })) ??
      [],
    [categories]
  );

  // --- Editing state ---
  const {
    editingRowId,
    setEditingRowId,
    exitEditModeOpen,
    setExitEditModeOpen,
    modal: explanationModal,
    setModal: setExplanationModal,
    isNewRow,
  } = useMaintainerEditingState({ methodologyVersionId });

  const addMutation = useAddSubcategory(methodologyVersionId);
  const updateMutation = useUpdateSubcategory(methodologyVersionId);
  const deleteMutation = useDeleteSubcategory(methodologyVersionId);

  // --- Form ---
  const { form, fieldArray, handleCellChange } = useSubcategoriesForm();
  const currentRows = form.watch("subcategories");

  // --- Sync form with server data ---
  const toFormData = useCallback(
    (data: unknown[]) =>
      (data as typeof subcategories & object).map(toFormSubcategory),
    []
  );
  useMaintainerFormSync({
    form,
    fieldName: "subcategories",
    editingRowId,
    methodologyVersionId,
    serverData: subcategories,
    toFormData,
  });

  // --- Row editing callbacks ---

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("subcategories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    const isValid = await form.trigger(`subcategories.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (row && isNewRow(row.id)) {
      if (!row.icon) return false;
      try {
        const result = await addMutation.mutateAsync({
          categoryId: row.categoryId,
          name: row.name,
          icon: row.icon,
          description: row.description,
          explanation: row.explanation || null,
          measurementUnitIds: row.measurementUnitIds,
        });
        fieldArray.update(rowIndex, toFormSubcategory(result));
        form.reset({ subcategories: form.getValues("subcategories") });
        void enqueueSnackbar({
          message: "Sub-categoría creada exitosamente",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear sub-categoría"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    const serverRow = subcategories?.find(({ id }) => id === editingRowId);
    const original = serverRow ? toFormSubcategory(serverRow) : null;
    const hasRealChanges =
      row &&
      (!original ||
        row.categoryId !== original.categoryId ||
        row.name !== original.name ||
        row.icon !== original.icon ||
        row.description !== original.description ||
        row.explanation !== original.explanation ||
        [...row.measurementUnitIds].sort().join() !==
          [...original.measurementUnitIds].sort().join());

    try {
      if (row && hasRealChanges && row.icon) {
        await updateMutation.mutateAsync({
          subcategoryId: row.id,
          data: {
            categoryId: row.categoryId,
            name: row.name,
            icon: row.icon,
            description: row.description,
            explanation: row.explanation || null,
            measurementUnitIds: row.measurementUnitIds,
          },
        });
        form.reset({ subcategories: form.getValues("subcategories") });
        void enqueueSnackbar({
          message: "Cambios guardados satisfactoriamente",
          variant: "success",
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
    return true;
  }, [
    editingRowId,
    form,
    isNewRow,
    addMutation,
    fieldArray,
    updateMutation,
    enqueueSnackbar,
    subcategories,
    setEditingRowId,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("subcategories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = subcategories?.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormSubcategory(original));
      }
    }

    form.reset({ subcategories: form.getValues("subcategories") });
    setEditingRowId(null);
  }, [
    editingRowId,
    form,
    isNewRow,
    fieldArray,
    subcategories,
    setEditingRowId,
  ]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) {
        const success = await handleStopEditRow();
        if (!success) return;
      }
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow, setEditingRowId]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const newRow: SubcategoryForm = {
      id: tempId,
      categoryId: "",
      name: "",
      icon: "",
      description: "",
      explanation: null,
      measurementUnitIds: [],
    };
    fieldArray.append(newRow);
    setEditingRowId(tempId);
  }, [fieldArray, setEditingRowId]);

  const handleDelete = useCallback(
    async (row: SubcategoryForm) => {
      try {
        const rows = form.getValues("subcategories");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) {
            setEditingRowId(null);
          }
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ subcategories: form.getValues("subcategories") });
          void enqueueSnackbar({
            message: "Sub-categoría eliminada",
            variant: "success",
          });
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar sub-categoría"),
          variant: "error",
        });
      }
    },
    [
      form,
      fieldArray,
      editingRowId,
      isNewRow,
      deleteMutation,
      enqueueSnackbar,
      setEditingRowId,
    ]
  );

  // --- Exit edit mode ---
  const { handleExitEditMode } = useMaintainerExitEditMode({
    editingRowId,
    handleCancelEditRow,
    effectiveMethodologyId: scope.effectiveMethodologyId,
    methodologies: scope.methodologies,
    selectMethodology: scope.selectMethodology,
    stopEditing: scope.stopEditing,
  });

  // --- Explanation modal ---

  const handleOpenExplanation = useCallback(
    (rowIndex: number) => {
      setExplanationModal({ open: true, rowIndex });
    },
    [setExplanationModal]
  );

  const handleSaveExplanation = useCallback(
    async (value: string) => {
      const { rowIndex } = explanationModal;
      if (rowIndex < 0) return;

      const previousExplanation = form.getValues(
        `subcategories.${rowIndex}.explanation`
      );
      handleCellChange(rowIndex, "explanation", value);

      const row = form.getValues(`subcategories.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        try {
          await updateMutation.mutateAsync({
            subcategoryId: row.id,
            data: { explanation: value || null },
          });
          form.reset({ subcategories: form.getValues("subcategories") });
          void enqueueSnackbar({
            message: "Explicación guardada",
            variant: "success",
          });
        } catch (error) {
          handleCellChange(
            rowIndex,
            "explanation",
            previousExplanation ?? null
          );
          void enqueueSnackbar({
            message: getApiErrorMessage(error, "Error al guardar explicación"),
            variant: "error",
          });
          throw error;
        }
      }
    },
    [
      explanationModal,
      handleCellChange,
      form,
      isNewRow,
      updateMutation,
      enqueueSnackbar,
    ]
  );

  // --- Scroll to bottom when a new row is added ---
  useEffect(() => {
    if (!editingRowId?.startsWith("temp_")) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }, [editingRowId]);

  // --- Block navigation while editing ---
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  // --- Column definitions ---
  const columns = useSubcategoryColumns({
    editingRowId,
    viewOnly: scope.isViewOnly,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onOpenExplanation: handleOpenExplanation,
    rows: currentRows,
    categories: categoryOptions,
    allMeasurementUnits: measurementUnits ?? [],
  });

  const explanationValue =
    explanationModal.rowIndex >= 0
      ? (form.getValues(
          `subcategories.${explanationModal.rowIndex}.explanation`
        ) ?? "")
      : "";

  const isDataReady =
    !isLoadingSubcategories &&
    !!subcategories &&
    !isLoadingCategories &&
    !!categories &&
    !isLoadingUnits &&
    !!measurementUnits;

  const errorMessage = isMethodologiesError
    ? "No fue posible cargar las metodologías."
    : isErrorSubcategories
      ? "No fue posible cargar las sub-categorías."
      : !scope.targetMethodology
        ? "No hay metodologías disponibles para mostrar sub-categorías."
        : null;

  return (
    <MaintainerScreenLayout
      title="Sub-categorías"
      scope={scope}
      editingRowId={editingRowId}
      form={form}
      formId="subcategories-form"
      errorMessage={errorMessage}
      onAddRow={handleAddRow}
      addDisabled={editingRowId !== null}
      onExitEditMode={handleExitEditMode}
      exitEditModeOpen={exitEditModeOpen}
      onExitEditModeOpenChange={setExitEditModeOpen}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      readOnlyDescription="Vista de solo lectura de las sub-categorías de esta metodología."
      editDescription="Gestiona las sub-categorías de esta metodología. Haz clic en una fila para editarla."
      extraModals={
        <ExplanationModal
          open={explanationModal.open}
          value={explanationValue}
          readOnly={scope.isViewOnly}
          onSave={handleSaveExplanation}
          onClose={() => setExplanationModal({ open: false, rowIndex: -1 })}
        />
      }
    >
      <MaintainerDataGrid
        editingRowId={editingRowId}
        columns={columns}
        rows={currentRows}
        loading={!isDataReady || scope.isLoadingMethodologies}
        getRowId={(row: SubcategoryForm) => row.id}
      />
    </MaintainerScreenLayout>
  );
};
