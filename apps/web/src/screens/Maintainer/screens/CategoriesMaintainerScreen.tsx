import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import {
  useCategories,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
  useSwapCategoryPositions,
} from "@/api/query/maintainer";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import {
  useCategoriesForm,
  toFormCategory,
  type CategoriesFormValues,
} from "../hooks/useCategoriesForm";
import { useCategoryColumns } from "../hooks/useCategoryColumns";
import { useMaintainerFormSync } from "../hooks/useMaintainerFormSync";
import { useMaintainerRowReorder } from "../hooks/useMaintainerRowReorder";
import { CategoryForm } from "@repo/types";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExplanationModal } from "../components/ExplanationModal";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";
import {
  EditModeToolbar,
  EDIT_MODE_TOOLBAR_HEIGHT,
} from "../components/EditModeToolbar";

const CATEGORIES_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "categories-maintainer",
} as const;

export const CategoriesMaintainerScreen: FC = () => {
  const {
    isViewOnly,
    methodologies,
    effectiveMethodologyId,
    methodologyVersionId,
    targetMethodology,
    methodologySelector,
    selectMethodology,
    stopEditing,
    isLoadingMethodologies,
    isMethodologiesError,
  } = useMaintainerMethodologyScope();
  const { enqueueSnackbar } = useSnackbar();

  // --- Data fetching ---
  const {
    data: categories,
    isLoading,
    isError: isErrorCategories,
  } = useCategories(methodologyVersionId);

  // --- Form & editing state ---
  const [editingState, setEditingState] = useState<{
    methodologyVersionId?: string;
    rowId: string | null;
  }>({ methodologyVersionId: undefined, rowId: null });
  const editingRowId =
    editingState.methodologyVersionId === methodologyVersionId
      ? editingState.rowId
      : null;
  const setEditingRowId = useCallback(
    (rowId: string | null) => {
      setEditingState({ methodologyVersionId, rowId });
    },
    [methodologyVersionId]
  );
  const [exitEditModeOpen, setExitEditModeOpen] = useState(false);
  const [explanationModalState, setExplanationModalState] = useState<{
    methodologyVersionId?: string;
    open: boolean;
    rowIndex: number;
  }>({ methodologyVersionId: undefined, open: false, rowIndex: -1 });
  const explanationModal = useMemo(
    () =>
      explanationModalState.methodologyVersionId === methodologyVersionId
        ? {
            open: explanationModalState.open,
            rowIndex: explanationModalState.rowIndex,
          }
        : { open: false, rowIndex: -1 },
    [explanationModalState, methodologyVersionId]
  );
  const setExplanationModal = useCallback(
    (value: { open: boolean; rowIndex: number }) => {
      setExplanationModalState({ methodologyVersionId, ...value });
    },
    [methodologyVersionId]
  );

  const addMutation = useAddCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const swapMutation = useSwapCategoryPositions();

  const { form, fieldArray, handleCellChange } = useCategoriesForm();
  const currentRows = form.watch("categories");

  // --- Sync form with server data ---
  // The shared hook, like the subcategories grid: it keeps `editingRowId` in
  // its dependencies, so a refetch that lands while a row is being edited is
  // replayed once the user leaves edit mode. Reading the id off a ref instead
  // dropped that refetch for good — and since a reorder is repainted by the
  // swap's own refetch and nothing else, the grid could keep the pre-swap
  // positions and send the same pair again on the next click.
  const toFormData = useCallback(
    (data: NonNullable<typeof categories>) => data.map(toFormCategory),
    []
  );
  useMaintainerFormSync({
    form,
    fieldName: "categories",
    editingRowId,
    methodologyVersionId,
    serverData: categories,
    toFormData,
  });

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  // --- Row editing callbacks ---

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("categories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    const isValid = await form.trigger(`categories.${rowIndex}`);
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
          methodologyVersionId: methodologyVersionId!,
          name: row.name,
          icon: row.icon,
          color: row.color,
          synonyms: row.synonyms,
          description: row.description,
          explanation: row.explanation || null,
          position: row.position,
        });
        fieldArray.update(rowIndex, toFormCategory(result));
        form.reset({ categories: form.getValues("categories") });
        void enqueueSnackbar({
          message: "Categoría creada exitosamente",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear categoría"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.categories?.[rowIndex];

    try {
      if (row && isRowDirty && row.icon) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: {
            name: row.name,
            icon: row.icon,
            color: row.color,
            synonyms: row.synonyms,
            description: row.description,
            explanation: row.explanation || null,
            position: row.position,
          },
        });
        form.reset({ categories: form.getValues("categories") });
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
    methodologyVersionId,
    form,
    isNewRow,
    addMutation,
    fieldArray,
    updateMutation,
    enqueueSnackbar,
    setEditingRowId,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("categories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = categories?.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormCategory(original));
      }
    }

    form.reset({ categories: form.getValues("categories") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, categories, setEditingRowId]);

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
    const rows = form.getValues("categories");
    const maxPosition = rows.reduce((max, r) => Math.max(max, r.position), 0);
    const newRow: CategoryForm = {
      id: tempId,
      name: "",
      icon: "",
      color: "",
      synonyms: "",
      description: "",
      explanation: null,
      position: maxPosition + 1,
    };
    fieldArray.prepend(newRow);
    setEditingRowId(tempId);
  }, [fieldArray, form, setEditingRowId]);

  const handleDelete = useCallback(
    async (row: CategoryForm) => {
      try {
        const rows = form.getValues("categories");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) {
            setEditingRowId(null);
          }
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ categories: form.getValues("categories") });
          void enqueueSnackbar({
            message: "Categoría eliminada",
            variant: "success",
          });
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar categoría"),
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

  const swapCategories = useCallback(
    (categoryIdA: string, categoryIdB: string) =>
      swapMutation.mutateAsync({ categoryIdA, categoryIdB }),
    [swapMutation]
  );

  const { handleMoveUp, handleMoveDown, isMoveBlocked } =
    useMaintainerRowReorder<CategoriesFormValues, CategoryForm>({
      form,
      fieldName: "categories",
      swap: swapCategories,
      errorMessage: "Error al mover categoría",
    });

  // --- Exit edit mode ---

  const handleExitEditModeNav = useCallback(() => {
    const target = methodologies.find((m) => m.id === effectiveMethodologyId);
    if (target) {
      selectMethodology({
        id: target.id,
        name: target.name,
        regulation: target.regulation,
      });
    } else {
      stopEditing();
    }
  }, [effectiveMethodologyId, methodologies, selectMethodology, stopEditing]);

  const handleExitEditMode = useCallback(() => {
    if (editingRowId) handleCancelEditRow();
    handleExitEditModeNav();
  }, [editingRowId, handleCancelEditRow, handleExitEditModeNav]);

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

      handleCellChange(rowIndex, "explanation", value);

      const row = form.getValues(`categories.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        try {
          await updateMutation.mutateAsync({
            id: row.id,
            data: { explanation: value || null },
          });
          form.reset({ categories: form.getValues("categories") });
          void enqueueSnackbar({
            message: "Explicación guardada",
            variant: "success",
          });
        } catch (error) {
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

  // --- Scroll to top when a new row is added (the new row is prepended). ---
  useEffect(() => {
    if (!editingRowId?.startsWith("temp_")) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [editingRowId]);

  // --- Block navigation while editing ---
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  // --- Column definitions ---
  const columns = useCategoryColumns({
    editingRowId,
    viewOnly: isViewOnly,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onOpenExplanation: handleOpenExplanation,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    moveDisabled: isMoveBlocked,
    rows: currentRows,
  });

  const explanationValue =
    explanationModal.rowIndex >= 0
      ? (form.getValues(
          `categories.${explanationModal.rowIndex}.explanation`
        ) ?? "")
      : "";

  const explanationRow =
    explanationModal.rowIndex >= 0
      ? form.getValues(`categories.${explanationModal.rowIndex}`)
      : undefined;

  if (
    !isLoadingMethodologies &&
    (isMethodologiesError || isErrorCategories || !targetMethodology)
  ) {
    const emptyStateMessage = isMethodologiesError
      ? "No fue posible cargar las metodologías."
      : isErrorCategories
        ? "No fue posible cargar las categorías."
        : "No hay metodologías disponibles para mostrar categorías.";

    return (
      <>
        <MaintainerPageHeader
          title="Categorías / Alcances"
          addLabel="Agregar fila"
          addDisabled
          extra={methodologySelector}
          explanationSlug={CATEGORIES_MAINTAINER_EXPLANATION_SLUGS.MAIN}
        />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            {emptyStateMessage}
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Categorías / Alcances"
        subtitle={
          isViewOnly
            ? "Vista de solo lectura de las categorías y alcances de esta metodología."
            : "Gestiona las categorías y alcances de esta metodología. Haz clic en una fila para editarla."
        }
        onAddRow={isViewOnly ? undefined : handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
        extra={methodologySelector}
        explanationSlug={CATEGORIES_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      />
      <Box
        className="rounded-sm bg-white p-3"
        sx={!isViewOnly ? { pb: `${EDIT_MODE_TOOLBAR_HEIGHT}px` } : undefined}
      >
        <form id="categories-form" noValidate>
          <Box className="flex w-full">
            <MaintainerDataGrid<CategoryForm>
              editingRowId={editingRowId}
              cellMaxHeight={70}
              // Same reason as the subcategories grid: the reorder arrows read
              // `position`, so a sorted grid would render one order and move
              // rows in another.
              disableColumnSorting
              searchable={{
                fuseOptions: {
                  keys: ["name", "description", "synonyms"],
                },
                placeholder: "Buscar categoría...",
                downloadFileName: "categorias",
                disableExport: true,
              }}
              showToolbar
              loading={isLoading || isLoadingMethodologies}
              columns={columns}
              rows={currentRows}
              rowHeight={70}
              getRowId={(row: CategoryForm) => row.id}
            />
          </Box>
        </form>
      </Box>
      {!isViewOnly && (
        <EditModeToolbar
          methodologyName={targetMethodology?.name ?? ""}
          onExitClick={() => setExitEditModeOpen(true)}
        />
      )}
      <Dialog
        open={exitEditModeOpen}
        onClose={() => setExitEditModeOpen(false)}
      >
        <DialogTitle>Salir de modo edición</DialogTitle>
        <DialogContent>
          {editingRowId ? (
            <DialogContentText>
              Tienes cambios sin guardar en la fila que estás editando. Si sales
              del modo edición, los cambios se perderán.
            </DialogContentText>
          ) : (
            <DialogContentText>
              Estás a punto de salir del modo edición de{" "}
              <strong>{targetMethodology?.name ?? ""}</strong>. Podrás volver a
              editarla desde la pantalla de Metodologías.
            </DialogContentText>
          )}
        </DialogContent>
        {/** TODO: Refactor this section to use a generic Modal component */}
        <DialogActions>
          <Button onClick={() => setExitEditModeOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setExitEditModeOpen(false);
              handleExitEditMode();
            }}
          >
            {editingRowId ? "Salir sin guardar" : "Salir"}
          </Button>
        </DialogActions>
      </Dialog>
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
      <ExplanationModal
        open={explanationModal.open}
        value={explanationValue}
        title={explanationRow?.name || undefined}
        subtitle={
          explanationRow?.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {explanationRow.description}
            </Typography>
          ) : undefined
        }
        readOnly={isViewOnly}
        onSave={handleSaveExplanation}
        onClose={() => setExplanationModal({ open: false, rowIndex: -1 })}
      />
    </FormProvider>
  );
};
