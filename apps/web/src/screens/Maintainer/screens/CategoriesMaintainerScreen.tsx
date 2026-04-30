import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBlocker } from "@tanstack/react-router";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";
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
import { useCategoriesForm, toFormCategory } from "../hooks/useCategoriesForm";
import { useCategoryColumns } from "../hooks/useCategoryColumns";
import { CategoryForm } from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExplanationModal } from "../components/ExplanationModal";
import { InfoBanner } from "../components/InfoBanner";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";

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

  const addMutation = useAddCategory(methodologyVersionId);
  const updateMutation = useUpdateCategory(methodologyVersionId);
  const deleteMutation = useDeleteCategory(methodologyVersionId);
  const swapMutation = useSwapCategoryPositions(methodologyVersionId);

  const { form, fieldArray, handleCellChange } = useCategoriesForm();
  const currentRows = form.watch("categories");

  // --- Sync form with server data ---
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    form.reset({ categories: [] });
  }, [methodologyVersionId, form]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!categories) return;
    form.reset({ categories: categories.map(toFormCategory) });
  }, [categories, form]);

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

  const handleMove = useCallback(
    async (row: CategoryForm, direction: "up" | "down") => {
      const rows = form.getValues("categories");
      const sorted = [...rows].sort((a, b) => a.position - b.position);
      const sortedIdx = sorted.findIndex((r) => r.id === row.id);

      if (row.id.startsWith("temp_")) return;
      if (direction === "up" && sortedIdx <= 0) return;
      if (
        direction === "down" &&
        (sortedIdx === -1 || sortedIdx >= sorted.length - 1)
      )
        return;

      const neighbor =
        sorted[direction === "up" ? sortedIdx - 1 : sortedIdx + 1];
      if (neighbor.id.startsWith("temp_")) return;

      try {
        await swapMutation.mutateAsync({
          categoryIdA: row.id,
          categoryIdB: neighbor.id,
        });
        const updatedRows = rows.map((r) => {
          if (r.id === row.id) return { ...r, position: neighbor.position };
          if (r.id === neighbor.id) return { ...r, position: row.position };
          return r;
        });
        updatedRows.sort((a, b) => a.position - b.position);
        form.reset({ categories: updatedRows });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al mover categoría"),
          variant: "error",
        });
      }
    },
    [form, swapMutation, enqueueSnackbar]
  );

  const handleMoveUp = useCallback(
    (row: CategoryForm) => handleMove(row, "up"),
    [handleMove]
  );

  const handleMoveDown = useCallback(
    (row: CategoryForm) => handleMove(row, "down"),
    [handleMove]
  );

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
        onAddRow={isViewOnly ? undefined : handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
        extra={methodologySelector}
        explanationSlug={CATEGORIES_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      />
      <Box
        className="rounded-sm bg-white p-3"
        sx={!isViewOnly ? { pb: 8 } : undefined}
      >
        {!isViewOnly && (
          <InfoBanner
            variant="success"
            title={`Editando metodología: ${targetMethodology?.name ?? ""}`}
            subtitle="Los cambios se aplicarán automáticamente"
          />
        )}
        <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
          {isViewOnly
            ? "Vista de solo lectura de las categorías y alcances de esta metodología."
            : "Gestiona las categorías y alcances de esta metodología. Haz clic en una fila para editarla."}
        </Typography>
        <form id="categories-form" noValidate>
          <Box className="flex w-full">
            <StylizedDataGrid
              sx={(theme) => ({
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: theme.palette.grey[200],
                },
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  maxHeight: 70,
                  alignItems: "center",
                },
                "& .MuiDataGrid-row.row--editing": {
                  backgroundColor: theme.palette.grey[100],
                },
              })}
              loading={isLoading || isLoadingMethodologies}
              columns={columns}
              rows={currentRows}
              rowHeight={70}
              getRowId={(row: CategoryForm) => row.id}
              getRowClassName={({ id }) =>
                String(id) === editingRowId ? "row--editing" : ""
              }
            />
          </Box>
        </form>
      </Box>
      {!isViewOnly && (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 4,
            py: 1.5,
            zIndex: 1200,
            borderTop: "2px solid",
            borderColor: "success.main",
          }}
        >
          <DotIcon sx={{ fontSize: 12, color: "success.main" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Editando: {targetMethodology?.name ?? ""}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => setExitEditModeOpen(true)}
          >
            Salir de modo edición
          </Button>
        </Paper>
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
