import {
  FC,
  ReactNode,
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
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import {
  useCategories,
  useMethodologies,
  useAddCategory,
  useUpdateCategory,
  useDeleteCategory,
  useSwapCategoryPositions,
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
import { InfoBanner } from "../components/InfoBanner";

/**
 * Outer wrapper that handles data fetching and defers form mount until data is
 * ready. This ensures `useForm` receives real data in `defaultValues` instead
 * of an empty array followed by `form.reset()`, which freezes `useFieldArray`
 * internals and breaks `register()` / DevTools.
 */
export const CategoriesMaintainerScreen: FC = () => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const { data: methodologies = [] } = useMethodologies();

  const [selectedMethodologyId, setSelectedMethodologyId] = useState<
    string | undefined
  >(undefined);

  const activeMethodology = useMemo(
    () =>
      methodologies.find(
        (m) => m.status === MethodologyVersionStatus.PUBLISHED
      ),
    [methodologies]
  );

  const effectiveMethodologyId =
    editingMethodology?.id ?? selectedMethodologyId ?? activeMethodology?.id;

  const handleExitEditMode = useCallback(() => {
    setSelectedMethodologyId(effectiveMethodologyId);
    stopEditing();
  }, [effectiveMethodologyId, stopEditing]);

  const targetMethodology = methodologies.find(
    (m) => m.id === effectiveMethodologyId
  );
  const methodologyVersionId = targetMethodology?.id;

  const isViewOnly =
    !editingMethodology ||
    targetMethodology?.status === MethodologyVersionStatus.PUBLISHED;

  const methodologySelector = (
    <Box className="flex items-center gap-1">
      <Typography variant="body2" color="text.secondary" noWrap>
        Metodología:
      </Typography>
      <Select
        size="small"
        value={effectiveMethodologyId ?? ""}
        disabled={!!editingMethodology}
        onChange={(e) => setSelectedMethodologyId(e.target.value)}
        sx={{ minWidth: 220 }}
      >
        {methodologies.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

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
          extra={methodologySelector}
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
      key={methodologyVersionId}
      targetMethodology={targetMethodology}
      methodologyVersionId={methodologyVersionId!}
      isViewOnly={isViewOnly}
      initialCategories={categories.map(toFormCategory)}
      serverCategories={categories}
      methodologySelector={methodologySelector}
      onExitEditMode={handleExitEditMode}
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
  methodologySelector: ReactNode;
  onExitEditMode: () => void;
}

const CategoriesForm: FC<CategoriesFormProps> = ({
  targetMethodology,
  methodologyVersionId,
  isViewOnly,
  initialCategories,
  serverCategories,
  methodologySelector,
  onExitEditMode,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [exitEditModeOpen, setExitEditModeOpen] = useState(false);
  const [explanationModal, setExplanationModal] = useState<{
    open: boolean;
    rowIndex: number;
  }>({ open: false, rowIndex: -1 });

  const addMutation = useAddCategory(methodologyVersionId);
  const updateMutation = useUpdateCategory(methodologyVersionId);
  const deleteMutation = useDeleteCategory(methodologyVersionId);
  const swapMutation = useSwapCategoryPositions(methodologyVersionId);

  // Form is initialised with real data via defaultValues — no form.reset()
  const { form, fieldArray, handleCellChange } =
    useCategoriesForm(initialCategories);
  const currentRows = form.watch("categories");

  // Sync form when server data changes (e.g. positions after a delete).
  // Use a ref so the effect only triggers on serverCategories changes, not on
  // editingRowId changes (which would reset mid-edit or before refetch arrives).
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);
  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    form.reset({ categories: serverCategories.map(toFormCategory) });
  }, [serverCategories, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

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
        form.reset({ categories: form.getValues("categories") });
        void enqueueSnackbar({
          message: "Categoría creada exitosamente",
          variant: "success",
        });
      } catch {
        void enqueueSnackbar({
          message: "Error al crear categoría",
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
        form.reset({ categories: form.getValues("categories") });
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

    form.reset({ categories: form.getValues("categories") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, serverCategories]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) {
        const success = await handleStopEditRow();
        if (!success) return;
      }
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
      icon: "",
      color: "",
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
          form.reset({ categories: form.getValues("categories") });
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

  const handleMoveUp = useCallback(
    async (row: FormCategory) => {
      const rows = form.getValues("categories");
      const sorted = [...rows].sort((a, b) => a.position - b.position);
      const sortedIdx = sorted.findIndex((r) => r.id === row.id);
      if (sortedIdx <= 0 || row.id.startsWith("temp_")) return;

      const above = sorted[sortedIdx - 1];
      if (above.id.startsWith("temp_")) return;

      try {
        await swapMutation.mutateAsync({
          categoryIdA: row.id,
          categoryIdB: above.id,
        });
        const updatedRows = rows.map((r) => {
          if (r.id === row.id) return { ...r, position: above.position };
          if (r.id === above.id) return { ...r, position: row.position };
          return r;
        });
        updatedRows.sort((a, b) => a.position - b.position);
        form.reset({ categories: updatedRows });
      } catch {
        void enqueueSnackbar({
          message: "Error al mover categoría",
          variant: "error",
        });
      }
    },
    [form, swapMutation, enqueueSnackbar]
  );

  const handleMoveDown = useCallback(
    async (row: FormCategory) => {
      const rows = form.getValues("categories");
      const sorted = [...rows].sort((a, b) => a.position - b.position);
      const sortedIdx = sorted.findIndex((r) => r.id === row.id);
      if (
        sortedIdx === -1 ||
        sortedIdx >= sorted.length - 1 ||
        row.id.startsWith("temp_")
      )
        return;

      const below = sorted[sortedIdx + 1];
      if (below.id.startsWith("temp_")) return;

      try {
        await swapMutation.mutateAsync({
          categoryIdA: row.id,
          categoryIdB: below.id,
        });
        const updatedRows = rows.map((r) => {
          if (r.id === row.id) return { ...r, position: below.position };
          if (r.id === below.id) return { ...r, position: row.position };
          return r;
        });
        updatedRows.sort((a, b) => a.position - b.position);
        form.reset({ categories: updatedRows });
      } catch {
        void enqueueSnackbar({
          message: "Error al mover categoría",
          variant: "error",
        });
      }
    },
    [form, swapMutation, enqueueSnackbar]
  );

  const handleExitEditMode = useCallback(() => {
    if (editingRowId) handleCancelEditRow();
    onExitEditMode();
  }, [editingRowId, handleCancelEditRow, onExitEditMode]);

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
          form.reset({ categories: form.getValues("categories") });
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
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
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
        extra={methodologySelector}
      />
      <Box className="rounded-sm bg-white p-3">
        {!isViewOnly && (
          <InfoBanner
            variant="success"
            title={`Editando metodología: ${targetMethodology.name}`}
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
                "& .MuiDataGrid-cell .MuiTextField-root": {
                  alignSelf: "center",
                },
                "& .MuiDataGrid-row.row--editing": {
                  backgroundColor: theme.palette.grey[100],
                },
              })}
              columns={columns}
              rows={currentRows}
              rowHeight={60}
              getRowId={(row: Category) => row.id}
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
              Editando: {targetMethodology.name}
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
              <strong>{targetMethodology.name}</strong>. Podrás volver a
              editarla desde la pantalla de Metodologías.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitEditModeOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            color={editingRowId ? "error" : "primary"}
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
        readOnly={isViewOnly}
        onSave={handleSaveExplanation}
        onClose={() => setExplanationModal({ open: false, rowIndex: -1 })}
      />
    </FormProvider>
  );
};
