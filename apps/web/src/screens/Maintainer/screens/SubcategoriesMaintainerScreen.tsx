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
  useSubcategories,
  useAddSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
} from "@/api/query/maintainer";
import { useMeasurementUnits } from "@/api/query";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import {
  useSubcategoriesForm,
  toFormSubcategory,
} from "../hooks/useSubcategoriesForm";
import { useSubcategoryColumns } from "../hooks/useSubcategoryColumns";
import { MethodologyVersionStatus, SubcategoryForm } from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExitEditModeDialog } from "../components/ExitEditModeDialog";
import { ExplanationModal } from "../components/ExplanationModal";
import { InfoBanner } from "../components/InfoBanner";

export const SubcategoriesMaintainerScreen: FC = () => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const selectedMethodology = useMaintainerStore((s) => s.selectedMethodology);
  const selectMethodology = useMaintainerStore((s) => s.selectMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const { enqueueSnackbar } = useSnackbar();
  const { data: methodologies = [], isError: isMethodologiesError } =
    useMethodologies();

  const activeMethodology = useMemo(
    () =>
      methodologies.find(
        (m) => m.status === MethodologyVersionStatus.PUBLISHED
      ),
    [methodologies]
  );

  const effectiveMethodologyId =
    editingMethodology?.id ?? selectedMethodology?.id ?? activeMethodology?.id;

  const targetMethodology = methodologies.find(
    (m) => m.id === effectiveMethodologyId
  );
  const methodologyVersionId = targetMethodology?.id;

  const isViewOnly =
    !editingMethodology ||
    targetMethodology?.status === MethodologyVersionStatus.PUBLISHED;

  // --- Data fetching ---
  const { data: subcategories, isLoading: isLoadingSubcategories } =
    useSubcategories(methodologyVersionId);
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

  // --- Form & editing state ---
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [exitEditModeOpen, setExitEditModeOpen] = useState(false);
  const [explanationModal, setExplanationModal] = useState<{
    open: boolean;
    rowIndex: number;
  }>({ open: false, rowIndex: -1 });

  const addMutation = useAddSubcategory(methodologyVersionId);
  const updateMutation = useUpdateSubcategory(methodologyVersionId);
  const deleteMutation = useDeleteSubcategory(methodologyVersionId);

  const { form, fieldArray, handleCellChange } = useSubcategoriesForm();
  const currentRows = form.watch("subcategories");

  // --- Sync form with server data ---
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!subcategories) return;
    form.reset({ subcategories: subcategories.map(toFormSubcategory) });
  }, [subcategories, form]);

  // --- Reset editing state when methodology changes ---
  const prevMethodologyVersionId = useRef(methodologyVersionId);
  if (prevMethodologyVersionId.current !== methodologyVersionId) {
    prevMethodologyVersionId.current = methodologyVersionId;
    setEditingRowId(null);
    setExplanationModal({ open: false, rowIndex: -1 });
  }

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

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
      try {
        const result = await addMutation.mutateAsync({
          categoryId: row.categoryId,
          name: row.name,
          icon: row.icon,
          description: row.description,
          examples: row.examples || null,
          measurementUnitIds: row.measurementUnitIds,
        });
        fieldArray.update(rowIndex, toFormSubcategory(result));
        form.reset({ subcategories: form.getValues("subcategories") });
        void enqueueSnackbar({
          message: "Sub-categoría creada exitosamente",
          variant: "success",
        });
      } catch {
        void enqueueSnackbar({
          message: "Error al crear sub-categoría",
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
        row.examples !== original.examples ||
        [...row.measurementUnitIds].sort().join() !==
          [...original.measurementUnitIds].sort().join());

    try {
      if (row && hasRealChanges) {
        await updateMutation.mutateAsync({
          subcategoryId: row.id,
          data: {
            categoryId: row.categoryId,
            name: row.name,
            icon: row.icon,
            description: row.description,
            examples: row.examples || null,
            measurementUnitIds: row.measurementUnitIds,
          },
        });
        form.reset({ subcategories: form.getValues("subcategories") });
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
    form,
    isNewRow,
    addMutation,
    fieldArray,
    updateMutation,
    enqueueSnackbar,
    subcategories,
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
  }, [editingRowId, form, isNewRow, fieldArray, subcategories]);

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
    const newRow: SubcategoryForm = {
      id: tempId,
      categoryId: "",
      name: "",
      icon: "",
      description: "",
      examples: null,
      measurementUnitIds: [],
    };
    fieldArray.append(newRow);
    setEditingRowId(tempId);
  }, [fieldArray]);

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
      } catch {
        void enqueueSnackbar({
          message: "Error al eliminar sub-categoría",
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, isNewRow, deleteMutation, enqueueSnackbar]
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

  const handleOpenExplanation = useCallback((rowIndex: number) => {
    setExplanationModal({ open: true, rowIndex });
  }, []);

  const handleSaveExplanation = useCallback(
    async (value: string) => {
      const { rowIndex } = explanationModal;
      if (rowIndex < 0) return;

      const previousExamples = form.getValues(
        `subcategories.${rowIndex}.examples`
      );
      handleCellChange(rowIndex, "examples", value);

      const row = form.getValues(`subcategories.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        try {
          await updateMutation.mutateAsync({
            subcategoryId: row.id,
            data: { examples: value || null },
          });
          form.reset({ subcategories: form.getValues("subcategories") });
          void enqueueSnackbar({
            message: "Explicación guardada",
            variant: "success",
          });
        } catch {
          handleCellChange(rowIndex, "examples", previousExamples ?? null);
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
    viewOnly: isViewOnly,
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
          `subcategories.${explanationModal.rowIndex}.examples`
        ) ?? "")
      : "";

  const methodologySelector = (
    <Box className="flex items-center gap-1">
      <Typography variant="body2" color="text.secondary" noWrap>
        Metodología:
      </Typography>
      <Select
        size="small"
        value={effectiveMethodologyId ?? ""}
        disabled={!!editingMethodology}
        onChange={(e) => {
          const m = methodologies.find((m) => m.id === e.target.value);
          if (m)
            selectMethodology({
              id: m.id,
              name: m.name,
              regulation: m.regulation,
            });
        }}
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

  if (methodologies.length === 0 || !targetMethodology) {
    const emptyStateMessage = isMethodologiesError
      ? "No fue posible cargar las metodologías."
      : methodologies.length === 0
        ? "No hay metodologías disponibles para mostrar sub-categorías."
        : "La metodología seleccionada no está disponible.";

    return (
      <>
        <MaintainerPageHeader
          title="Sub-categorías"
          addLabel="Agregar fila"
          addDisabled
          extra={methodologySelector}
        />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            {emptyStateMessage}
          </Typography>
        </Box>
      </>
    );
  }

  const isDataReady =
    !isLoadingSubcategories &&
    !!subcategories &&
    !isLoadingCategories &&
    !!categories &&
    !isLoadingUnits &&
    !!measurementUnits;

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Sub-categorías"
        onAddRow={isViewOnly ? undefined : handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
        extra={methodologySelector}
      />
      <Box
        className="rounded-sm bg-white p-3"
        sx={!isViewOnly ? { pb: 8 } : undefined}
      >
        {!isViewOnly && (
          <InfoBanner
            variant="success"
            title={`Editando metodología: ${targetMethodology.name}`}
            subtitle="Los cambios se aplicarán automáticamente"
          />
        )}
        <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
          {isViewOnly
            ? "Vista de solo lectura de las sub-categorías de esta metodología."
            : "Gestiona las sub-categorías de esta metodología. Haz clic en una fila para editarla."}
        </Typography>
        <form id="subcategories-form" noValidate>
          <Box className="flex w-full">
            <StylizedDataGrid
              sx={(theme) => ({
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: theme.palette.grey[200],
                },
                "& .MuiDataGrid-cell": {
                  display: "flex",
                  maxHeight: 100,
                  alignItems: "center",
                },
                "& .MuiDataGrid-row.row--editing": {
                  backgroundColor: theme.palette.grey[100],
                },
              })}
              columns={columns}
              rows={currentRows}
              loading={!isDataReady}
              getRowId={(row: SubcategoryForm) => row.id}
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
      <ExitEditModeDialog
        open={exitEditModeOpen}
        methodologyName={targetMethodology.name}
        hasUnsavedRow={editingRowId !== null}
        onClose={() => setExitEditModeOpen(false)}
        onConfirm={() => {
          setExitEditModeOpen(false);
          handleExitEditMode();
        }}
      />
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
