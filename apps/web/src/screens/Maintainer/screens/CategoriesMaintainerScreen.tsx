import { FC, useCallback, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { Box, Paper, Typography } from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import {
  useCategories,
  useMethodologies,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/api/query/maintainer";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import {
  FormCategory,
  useCategoriesForm,
  toFormCategory,
} from "../hooks/useCategoriesForm";
import { useCategoryColumns } from "../hooks/useCategoryColumns";
import { MethodologyVersionStatus, type Category } from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@components/FormDebugPanel";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExplanationModal } from "../components/ExplanationModal";

/**
 * Outer wrapper that handles data fetching and defers form mount until data is
 * ready. This ensures `useForm` receives real data in `defaultValues` instead
 * of an empty array followed by `form.reset()`, which freezes `useFieldArray`
 * internals and breaks `register()` / DevTools.
 */
export const CategoriesMaintainerScreen: FC = () => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const { data: methodologies = [] } = useMethodologies();

  const activeMethodology = useMemo(
    () =>
      methodologies.find(
        (m) => m.status === MethodologyVersionStatus.PUBLISHED
      ),
    [methodologies]
  );

  const targetMethodology = editingMethodology ?? activeMethodology;
  const methodologyVersionId = targetMethodology?.id;

  const targetMethodologyStatus = useMemo(
    () => methodologies.find((m) => m.id === targetMethodology?.id)?.status,
    [methodologies, targetMethodology?.id]
  );

  const isViewOnly =
    !editingMethodology ||
    targetMethodologyStatus === MethodologyVersionStatus.PUBLISHED;

  const { data: categories, isLoading } = useCategories(methodologyVersionId);

  if (!targetMethodology) return null;

  // Defer form mount until the first successful fetch so `defaultValues` gets
  // the real data and `useFieldArray` + `register()` work correctly.
  if (isLoading || !categories) {
    return (
      <>
        <MaintainerPageHeader
          title="Categorías / Alcances"
          addLabel="Agregar fila"
          addDisabled
        />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            Cargando categorías…
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <CategoriesForm
      targetMethodology={targetMethodology}
      methodologyVersionId={methodologyVersionId!}
      isViewOnly={isViewOnly}
      initialCategories={categories.map(toFormCategory)}
      serverCategories={categories}
    />
  );
};

// ---------------------------------------------------------------------------

interface CategoriesFormProps {
  targetMethodology: { id: string; name: string };
  methodologyVersionId: string;
  isViewOnly: boolean;
  initialCategories: FormCategory[];
  serverCategories: Category[];
}

const CategoriesForm: FC<CategoriesFormProps> = ({
  targetMethodology,
  methodologyVersionId,
  isViewOnly,
  initialCategories,
  serverCategories,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [explanationModal, setExplanationModal] = useState<{
    open: boolean;
    rowIndex: number;
  }>({ open: false, rowIndex: -1 });

  const addMutation = useAddCategory(methodologyVersionId);
  const updateMutation = useUpdateCategory(methodologyVersionId);
  const deleteMutation = useDeleteCategory(methodologyVersionId);

  // Form is initialised with real data via defaultValues — no form.reset()
  const { form, fieldArray, handleCellChange } =
    useCategoriesForm(initialCategories);
  const currentRows = form.watch("categories");

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  const handleStopEditRow = useCallback(async () => {
    if (!editingRowId) return;

    const rows = form.getValues("categories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    const isValid = await form.trigger(`categories.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return;
    }

    if (row && isNewRow(row.id)) {
      try {
        const result = await addMutation.mutateAsync({
          methodologyVersionId,
          name: row.name,
          icon: row.icon,
          color: row.color,
          synonyms: row.synonyms,
          description: row.description,
          examples: row.examples || null,
          position: row.position,
        });
        fieldArray.update(rowIndex, toFormCategory(result));
        void enqueueSnackbar({
          message: "Categoría creada exitosamente",
          variant: "success",
        });
      } catch {
        void enqueueSnackbar({
          message: "Error al crear categoría",
          variant: "error",
        });
        return;
      }
      setEditingRowId(null);
      return;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.categories?.[rowIndex];

    try {
      if (row && isRowDirty) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: {
            name: row.name,
            icon: row.icon,
            color: row.color,
            synonyms: row.synonyms,
            description: row.description,
            examples: row.examples || null,
            position: row.position,
          },
        });
        void enqueueSnackbar({
          message: "Cambios guardados satisfactoriamente",
          variant: "success",
        });
      }
    } catch {
      void enqueueSnackbar({
        message: "Error al guardar cambios",
        variant: "error",
      });
    }
    setEditingRowId(null);
  }, [
    editingRowId,
    methodologyVersionId,
    form,
    isNewRow,
    addMutation,
    fieldArray,
    updateMutation,
    enqueueSnackbar,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("categories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = serverCategories.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormCategory(original));
      }
    }

    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, serverCategories]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) await handleStopEditRow();
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const rows = form.getValues("categories");
    const maxPosition = rows.reduce((max, r) => Math.max(max, r.position), 0);
    const newRow: FormCategory = {
      id: tempId,
      name: "",
      icon: "factory",
      color: "#F5E6D3",
      synonyms: "",
      description: "",
      examples: null,
      position: maxPosition + 1,
    };
    fieldArray.append(newRow);
    setEditingRowId(tempId);
  }, [fieldArray, form]);

  const handleDelete = useCallback(
    async (row: FormCategory) => {
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
          void enqueueSnackbar({
            message: "Categoría eliminada",
            variant: "success",
          });
        }
      } catch {
        void enqueueSnackbar({
          message: "Error al eliminar categoría",
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, isNewRow, deleteMutation, enqueueSnackbar]
  );

  const handleOpenExplanation = useCallback((rowIndex: number) => {
    setExplanationModal({ open: true, rowIndex });
  }, []);

  const handleSaveExplanation = useCallback(
    async (value: string) => {
      const { rowIndex } = explanationModal;
      if (rowIndex < 0) return;

      handleCellChange(rowIndex, "examples", value);

      const row = form.getValues(`categories.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        try {
          await updateMutation.mutateAsync({
            id: row.id,
            data: { examples: value || null },
          });
          void enqueueSnackbar({
            message: "Explicación guardada",
            variant: "success",
          });
        } catch {
          void enqueueSnackbar({
            message: "Error al guardar explicación",
            variant: "error",
          });
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

  // --- Block navigation while editing ---
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => editingRowId !== null,
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
    rows: currentRows,
  });

  const explanationValue =
    explanationModal.rowIndex >= 0
      ? (form.getValues(`categories.${explanationModal.rowIndex}.examples`) ??
        "")
      : "";

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Categorías / Alcances"
        onAddRow={isViewOnly ? undefined : handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
      />
      <Box className="rounded-sm bg-white p-3">
        {!isViewOnly && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2.5,
              py: 1.5,
              mb: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "success.main",
              backgroundColor: "rgba(0, 110, 77, 0.04)",
            }}
          >
            <DotIcon sx={{ fontSize: 12, color: "success.main" }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Editando metodología: {targetMethodology.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Los cambios se aplicarán al guardar la metodología completa
              </Typography>
            </Box>
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isViewOnly
            ? "Vista de solo lectura de las categorías y alcances de esta metodología."
            : "Gestiona las categorías y alcances de esta metodología. Haz clic en una celda para editarla."}
        </Typography>
        <form id="categories-form" noValidate>
          <Box className="flex w-full">
            <StylizedDataGrid
              sx={(theme) => ({
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: theme.palette.grey[200],
                },
                "& .MuiDataGrid-cell .MuiTextField-root": {
                  alignSelf: "center",
                },
              })}
              columns={columns}
              rows={currentRows}
              rowHeight={60}
              getRowId={(row: Category) => row.id}
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
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Editando: {targetMethodology.name}
            </Typography>
          </Box>
        </Paper>
      )}
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
      <ExplanationModal
        open={explanationModal.open}
        value={explanationValue}
        readOnly={isViewOnly}
        onSave={handleSaveExplanation}
        onClose={() => setExplanationModal({ open: false, rowIndex: -1 })}
      />
    </FormProvider>
  );
};
