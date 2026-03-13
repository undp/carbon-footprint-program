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
import { Box, Button, Paper, Typography } from "@mui/material";
import { FiberManualRecord as DotIcon } from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import {
  useCategories,
  useSubcategories,
  useAddSubcategory,
  useUpdateSubcategory,
  useDeleteSubcategory,
  useEmissionFactorDimensions,
  useUpsertEmissionFactorDimensions,
  useEmissionFactors,
} from "@/api/query/maintainer";
import { useMeasurementUnits } from "@/api/query";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import {
  useSubcategoriesForm,
  toFormSubcategory,
} from "../hooks/useSubcategoriesForm";
import { useSubcategoryColumns } from "../hooks/useSubcategoryColumns";
import { SubcategoryForm, type GetAllSubcategoriesResponse } from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExitEditModeDialog } from "../components/ExitEditModeDialog";
import { ExplanationModal } from "../components/ExplanationModal";
import { InfoBanner } from "../components/InfoBanner";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";
import { VariableConfigModal } from "../components/VariableConfigModal";

type Subcategory = GetAllSubcategoriesResponse[number];

export const SubcategoriesMaintainerScreen: FC = () => {
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
    data: subcategories,
    isLoading: isLoadingSubcategories,
    isError: isErrorSubcategories,
  } = useSubcategories(methodologyVersionId);
  const { data: categories, isLoading: isLoadingCategories } =
    useCategories(methodologyVersionId);
  const { data: measurementUnits, isLoading: isLoadingUnits } =
    useMeasurementUnits();
  // Dimensions and emission factors are loaded in the background — they don't block the form mount.
  const { data: dimensions = [] } =
    useEmissionFactorDimensions(methodologyVersionId);
  const { data: emissionFactors = [] } =
    useEmissionFactors(methodologyVersionId);

  const categoryOptions = useMemo(
    () =>
      categories?.map((c) => ({ id: c.id, name: c.name, color: c.color })) ??
      [],
    [categories]
  );

  const subcategoryIdsWithEFs = useMemo(
    () =>
      new Set(
        emissionFactors.map((emissionFactor) => emissionFactor.subcategoryId)
      ),
    [emissionFactors]
  );

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
  const [variableConfigRow, setVariableConfigRow] = useState<{
    subcategoryId: string;
    subcategoryName: string;
  } | null>(null);

  const addMutation = useAddSubcategory(methodologyVersionId);
  const updateMutation = useUpdateSubcategory(methodologyVersionId);
  const deleteMutation = useDeleteSubcategory(methodologyVersionId);
  const upsertDimensions =
    useUpsertEmissionFactorDimensions(methodologyVersionId);

  const { form, fieldArray, handleCellChange } = useSubcategoriesForm();
  const currentRows = form.watch("subcategories");

  // --- Sync form with server data ---
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    form.reset({ subcategories: [] });
  }, [methodologyVersionId, form]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!subcategories) return;
    form.reset({ subcategories: subcategories.map(toFormSubcategory) });
  }, [subcategories, form]);

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
      if (!row.icon) return false;
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
        row.examples !== original.examples ||
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
      examples: null,
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

  const handleOpenVariableConfig = useCallback(
    (rowId: string) => {
      const sub = serverSubcategories.find((s) => s.id === rowId);
      if (sub) {
        setVariableConfigRow({
          subcategoryId: sub.id,
          subcategoryName: sub.name,
        });
      }
    },
    [serverSubcategories]
  );

  const handleSaveVariableConfig = useCallback(
    (
      subcategoryId: string,
      dimensions: Array<{
        code: string;
        name: string;
        position: number;
        isRequired: boolean;
      }>
    ) => {
      void upsertDimensions
        .mutateAsync([
          {
            subcategoryId,
            dimensions,
          },
        ])
        .then(() => {
          void enqueueSnackbar({
            message: "Configuración de variables guardada",
            variant: "success",
          });
        })
        .catch(() => {
          void enqueueSnackbar({
            message: "Error al guardar configuración de variables",
            variant: "error",
          });
        });
    },
    [upsertDimensions, enqueueSnackbar]
  );

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
        } catch (error) {
          handleCellChange(rowIndex, "examples", previousExamples ?? null);
          void enqueueSnackbar({
            message: getApiErrorMessage(error, "Error al guardar explicación"),
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
    onConfigureVariables: handleOpenVariableConfig,
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

  const isDataReady =
    !isLoadingSubcategories &&
    !!subcategories &&
    !isLoadingCategories &&
    !!categories &&
    !isLoadingUnits &&
    !!measurementUnits;

  if (
    !isLoadingMethodologies &&
    (isMethodologiesError || isErrorSubcategories || !targetMethodology)
  ) {
    const emptyStateMessage = isMethodologiesError
      ? "No fue posible cargar las metodologías."
      : isErrorSubcategories
        ? "No fue posible cargar las sub-categorías."
        : "No hay metodologías disponibles para mostrar sub-categorías.";

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
            title={`Editando metodología: ${targetMethodology?.name ?? ""}`}
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
                "& .MuiDataGrid-cell .MuiOutlinedInput-root": {
                  backgroundColor: theme.palette.common.white,
                },
                "& .MuiDataGrid-cell .MuiSelect-select": {
                  backgroundColor: theme.palette.common.white,
                },
                "& .MuiDataGrid-row.row--editing": {
                  backgroundColor: theme.palette.grey[100],
                },
              })}
              columns={columns}
              rows={currentRows}
              loading={!isDataReady || isLoadingMethodologies}
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
      <ExitEditModeDialog
        open={exitEditModeOpen}
        methodologyName={targetMethodology?.name ?? ""}
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
      <VariableConfigModal
        open={variableConfigRow !== null}
        readOnly={isViewOnly}
        hasEmissionFactors={subcategoryIdsWithEFs.has(
          variableConfigRow?.subcategoryId ?? ""
        )}
        subcategoryId={variableConfigRow?.subcategoryId ?? ""}
        subcategoryName={variableConfigRow?.subcategoryName ?? ""}
        currentDimensions={
          serverDimensions
            .find((d) => d.subcategoryId === variableConfigRow?.subcategoryId)
            ?.dimensions.map(({ code, name, position, isRequired }) => ({
              code,
              name,
              position,
              isRequired,
            })) ?? []
        }
        onSave={handleSaveVariableConfig}
        onClose={() => setVariableConfigRow(null)}
      />
    </FormProvider>
  );
};
