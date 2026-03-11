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
import {
  MethodologyVersionStatus,
  SubcategoryForm,
  type GetAllMeasurementUnitsResponse,
} from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExitEditModeDialog } from "../components/ExitEditModeDialog";
import { ExplanationModal } from "../components/ExplanationModal";
import { InfoBanner } from "../components/InfoBanner";
import { Subcategory } from "../types";

/**
 * Outer wrapper that handles data fetching and defers form mount until data is
 * ready. This ensures `useForm` receives real data in `defaultValues` instead
 * of an empty array followed by `form.reset()`, which freezes `useFieldArray`
 * internals and breaks `register()` / DevTools.
 */
export const SubcategoriesMaintainerScreen: FC = () => {
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const selectedMethodology = useMaintainerStore((s) => s.selectedMethodology);
  const selectMethodology = useMaintainerStore((s) => s.selectMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const { data: methodologies = [] } = useMethodologies();

  const activeMethodology = useMemo(
    () =>
      methodologies.find(
        (m) => m.status === MethodologyVersionStatus.PUBLISHED
      ),
    [methodologies]
  );

  const effectiveMethodologyId =
    editingMethodology?.id ?? selectedMethodology?.id ?? activeMethodology?.id;

  const handleExitEditMode = useCallback(() => {
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

  const { data: subcategories, isLoading: isLoadingSubcategories } =
    useSubcategories(methodologyVersionId);
  const { data: categories, isLoading: isLoadingCategories } =
    useCategories(methodologyVersionId);
  const { data: measurementUnits, isLoading: isLoadingUnits } =
    useMeasurementUnits();

  if (!targetMethodology) return null;

  // Defer form mount until all data is available.
  if (
    isLoadingSubcategories ||
    !subcategories ||
    isLoadingCategories ||
    !categories ||
    isLoadingUnits ||
    !measurementUnits
  ) {
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
            Cargando sub-categorías…
          </Typography>
        </Box>
      </>
    );
  }

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  return (
    <SubcategoriesForm
      key={methodologyVersionId}
      targetMethodology={targetMethodology}
      methodologyVersionId={methodologyVersionId!}
      isViewOnly={isViewOnly}
      initialSubcategories={subcategories.map(toFormSubcategory)}
      serverSubcategories={subcategories}
      categories={categoryOptions}
      allMeasurementUnits={measurementUnits}
      methodologySelector={methodologySelector}
      onExitEditMode={handleExitEditMode}
    />
  );
};

// ---------------------------------------------------------------------------

interface SubcategoriesFormProps {
  targetMethodology: { id: string; name: string };
  methodologyVersionId: string;
  isViewOnly: boolean;
  initialSubcategories: SubcategoryForm[];
  serverSubcategories: Subcategory[];
  categories: Array<{ id: string; name: string; color: string }>;
  allMeasurementUnits: GetAllMeasurementUnitsResponse;
  methodologySelector: ReactNode;
  onExitEditMode: () => void;
}

const SubcategoriesForm: FC<SubcategoriesFormProps> = ({
  targetMethodology,
  methodologyVersionId,
  isViewOnly,
  initialSubcategories,
  serverSubcategories,
  categories,
  allMeasurementUnits,
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

  const addMutation = useAddSubcategory(methodologyVersionId);
  const updateMutation = useUpdateSubcategory(methodologyVersionId);
  const deleteMutation = useDeleteSubcategory(methodologyVersionId);

  // Form is initialised with real data via defaultValues — no form.reset()
  const { form, fieldArray, handleCellChange } =
    useSubcategoriesForm(initialSubcategories);
  const currentRows = form.watch("subcategories");

  // Sync form when server data changes (e.g. after a delete).
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);
  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    form.reset({
      subcategories: serverSubcategories.map(toFormSubcategory),
    });
  }, [serverSubcategories, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

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

    const serverRow = serverSubcategories.find(({ id }) => id === editingRowId);
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
    serverSubcategories,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("subcategories");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = serverSubcategories.find(
        ({ id }) => id === editingRowId
      );
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormSubcategory(original));
      }
    }

    form.reset({ subcategories: form.getValues("subcategories") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, serverSubcategories]);

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
    categories,
    allMeasurementUnits,
  });

  const explanationValue =
    explanationModal.rowIndex >= 0
      ? (form.getValues(
          `subcategories.${explanationModal.rowIndex}.examples`
        ) ?? "")
      : "";

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
                  alignItems: "center",
                },
                "& .MuiDataGrid-row.row--editing": {
                  backgroundColor: theme.palette.grey[100],
                },
              })}
              columns={columns}
              rows={currentRows}
              getRowHeight={() => 100}
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
