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
  useSubcategories,
  useEmissionFactorDimensions,
  useCreateEmissionFactorDimension,
  useUpdateEmissionFactorDimension,
  useDeleteEmissionFactorDimension,
} from "@/api/query/maintainer";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import {
  useDimensionsForm,
  flattenDimensions,
  type DimensionFormRow,
} from "../hooks/useDimensionsForm";
import { useDimensionColumns } from "../hooks/useDimensionColumns";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExitEditModeDialog } from "../components/ExitEditModeDialog";
import { DimensionVariablesModal } from "../components/DimensionVariablesModal";
import { InfoBanner } from "../components/InfoBanner";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";

export const DimensionsMaintainerScreen: FC = () => {
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
    data: dimensionsData,
    isLoading: isLoadingDimensions,
    isError: isErrorDimensions,
  } = useEmissionFactorDimensions(methodologyVersionId);
  const { data: subcategories, isLoading: isLoadingSubcategories } =
    useSubcategories(methodologyVersionId);
  const subcategoryOptions = useMemo(
    () =>
      subcategories?.map((s) => ({
        id: s.id,
        name: s.name,
        categoryName: s.category.name,
      })) ?? [],
    [subcategories]
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
  const [variablesModalState, setVariablesModalState] = useState<{
    methodologyVersionId?: string;
    open: boolean;
    rowIndex: number;
  }>({ methodologyVersionId: undefined, open: false, rowIndex: -1 });
  const variablesModal = useMemo(
    () =>
      variablesModalState.methodologyVersionId === methodologyVersionId
        ? {
            open: variablesModalState.open,
            rowIndex: variablesModalState.rowIndex,
          }
        : { open: false, rowIndex: -1 },
    [variablesModalState, methodologyVersionId]
  );
  const setVariablesModal = useCallback(
    (value: { open: boolean; rowIndex: number }) => {
      setVariablesModalState({ methodologyVersionId, ...value });
    },
    [methodologyVersionId]
  );

  const createMutation = useCreateEmissionFactorDimension(methodologyVersionId);
  const updateMutation = useUpdateEmissionFactorDimension(methodologyVersionId);
  const deleteMutation = useDeleteEmissionFactorDimension(methodologyVersionId);

  const { form, fieldArray, handleCellChange } = useDimensionsForm();
  const currentRows = form.watch("dimensions");

  // --- Sync form with server data ---
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    form.reset({ dimensions: [] });
  }, [methodologyVersionId, form]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!dimensionsData) return;
    form.reset({ dimensions: flattenDimensions(dimensionsData) });
  }, [dimensionsData, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  // --- Helper to find original dimension from server data ---
  const findOriginal = useCallback(
    (id: string) => {
      if (!dimensionsData) return null;
      for (const subcat of dimensionsData) {
        for (const dim of subcat.dimensions) {
          if (dim.id === id) return { ...dim, subcategoryId: subcat.subcategoryId };
        }
      }
      return null;
    },
    [dimensionsData]
  );

  // --- Row editing callbacks ---

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("dimensions");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    if (!row) return true;

    const isValid = await form.trigger(`dimensions.${rowIndex}`);
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
          subcategoryId: row.subcategoryId,
          name: row.name,
          position: row.position,
          isRequired: row.isRequired,
          values: row.variables.map((v) => v.value),
        });
        const subcatName =
          subcategoryOptions.find((s) => s.id === row.subcategoryId)?.name ??
          row.subcategoryName;
        fieldArray.update(rowIndex, {
          id: result.id,
          subcategoryId: result.subcategoryId,
          subcategoryName: subcatName,
          name: result.name,
          position: result.position,
          isRequired: result.isRequired,
          variables: result.values.map((v) => ({ id: v.id, value: v.value })),
        });
        form.reset({ dimensions: form.getValues("dimensions") });
        void enqueueSnackbar({
          message: "Dimensión creada exitosamente",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear dimensión"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    // Existing row — compute diff
    const original = findOriginal(row.id);
    if (!original) {
      setEditingRowId(null);
      return true;
    }

    const payload: {
      name?: string;
      isRequired?: boolean;
      values?: {
        add?: string[];
        remove?: string[];
        rename?: Array<{ id: string; newValue: string }>;
      };
    } = {};

    if (row.name !== original.name) payload.name = row.name;
    if (row.isRequired !== original.isRequired)
      payload.isRequired = row.isRequired;

    const currentRealIds = new Set(
      row.variables
        .filter((v) => !v.id.startsWith("new_"))
        .map((v) => v.id)
    );
    const removedIds = original.values
      .filter((v) => !currentRealIds.has(v.id))
      .map((v) => v.id);
    const addedValues = row.variables
      .filter((v) => v.id.startsWith("new_"))
      .map((v) => v.value);
    const renamedValues: Array<{ id: string; newValue: string }> = [];

    // Detect renamed variables (same id, different value)
    for (const v of row.variables) {
      if (v.id.startsWith("new_")) continue;
      const orig = original.values.find((ov) => ov.id === v.id);
      if (orig && orig.value !== v.value) {
        renamedValues.push({ id: v.id, newValue: v.value });
      }
    }

    if (removedIds.length > 0 || addedValues.length > 0 || renamedValues.length > 0) {
      payload.values = {};
      if (removedIds.length > 0) payload.values.remove = removedIds;
      if (addedValues.length > 0) payload.values.add = addedValues;
      if (renamedValues.length > 0) payload.values.rename = renamedValues;
    }

    try {
      if (Object.keys(payload).length > 0) {
        await updateMutation.mutateAsync({ id: row.id, data: payload });
        form.reset({ dimensions: form.getValues("dimensions") });
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
    createMutation,
    updateMutation,
    fieldArray,
    enqueueSnackbar,
    setEditingRowId,
    subcategoryOptions,
    findOriginal,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("dimensions");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = findOriginal(editingRowId);
      if (original && rowIndex !== -1) {
        const subcatName =
          subcategoryOptions.find((s) => s.id === original.subcategoryId)
            ?.name ?? rows[rowIndex].subcategoryName;
        fieldArray.update(rowIndex, {
          id: original.id,
          subcategoryId: original.subcategoryId,
          subcategoryName: subcatName,
          name: original.name,
          position: original.position,
          isRequired: original.isRequired,
          variables: original.values.map((v) => ({ id: v.id, value: v.value })),
        });
      }
    }

    form.reset({ dimensions: form.getValues("dimensions") });
    setEditingRowId(null);
  }, [
    editingRowId,
    form,
    isNewRow,
    fieldArray,
    findOriginal,
    subcategoryOptions,
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
    const newRow: DimensionFormRow = {
      id: tempId,
      subcategoryId: "",
      subcategoryName: "",
      name: "",
      position: 1,
      isRequired: false,
      variables: [],
    };
    fieldArray.append(newRow);
    setEditingRowId(tempId);
  }, [fieldArray, setEditingRowId]);

  // --- Subcategory change for new rows ---
  const handleSubcategoryChange = useCallback(
    (rowIndex: number, subcategoryId: string) => {
      const rows = form.getValues("dimensions");
      const existingForSubcat = rows.filter(
        (r) =>
          r.subcategoryId === subcategoryId && !r.id.startsWith("temp_")
      );

      if (existingForSubcat.length >= 2) {
        void enqueueSnackbar({
          message: "Esta subcategoría ya tiene 2 dimensiones",
          variant: "error",
        });
        return;
      }

      const newPosition = existingForSubcat.length === 0 ? 1 : 2;
      const subcatName =
        subcategoryOptions.find((s) => s.id === subcategoryId)?.name ?? "";

      const currentRow = rows[rowIndex];
      if (!currentRow) return;

      const updatedRow: DimensionFormRow = {
        ...currentRow,
        subcategoryId,
        subcategoryName: subcatName,
        position: newPosition,
      };

      // Find where to insert: right after existing dimensions for this subcategory
      const lastIndexForSubcat = rows.reduce(
        (maxIdx, r, i) =>
          r.subcategoryId === subcategoryId && !r.id.startsWith("temp_")
            ? i
            : maxIdx,
        -1
      );

      if (lastIndexForSubcat !== -1 && lastIndexForSubcat + 1 !== rowIndex) {
        fieldArray.remove(rowIndex);
        fieldArray.insert(lastIndexForSubcat + 1, updatedRow);
      } else {
        fieldArray.update(rowIndex, updatedRow);
        form.setValue(`dimensions.${rowIndex}.subcategoryId`, subcategoryId, {
          shouldDirty: true,
        });
        form.setValue(`dimensions.${rowIndex}.subcategoryName`, subcatName);
        form.setValue(`dimensions.${rowIndex}.position`, newPosition);
      }
    },
    [form, fieldArray, subcategoryOptions, enqueueSnackbar]
  );

  const handleDelete = useCallback(
    async (row: DimensionFormRow) => {
      try {
        const rows = form.getValues("dimensions");
        const persistedRowsInSubcategory = rows.filter(
          (candidate) =>
            candidate.subcategoryId === row.subcategoryId &&
            !candidate.id.startsWith("temp_")
        ).length;

        if (
          !isNewRow(row.id) &&
          persistedRowsInSubcategory > 1 &&
          row.position === 1
        ) {
          void enqueueSnackbar({
            message:
              "Solo puedes eliminar la posición 1 cuando es la única dimensión de la subcategoría",
            variant: "warning",
          });
          return;
        }

        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) {
            setEditingRowId(null);
          }
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync({ id: row.id });
          }
          fieldArray.remove(index);
          form.reset({ dimensions: form.getValues("dimensions") });
          void enqueueSnackbar({
            message: "Dimensión eliminada",
            variant: "success",
          });
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar dimensión"),
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

  // --- Variables modal ---
  const handleOpenVariables = useCallback(
    async (rowIndex: number) => {
      const rows = form.getValues("dimensions");
      const row = rows[rowIndex];
      if (!row) return;

      // Auto-start editing if not already
      if (editingRowId !== row.id && !isViewOnly) {
        if (editingRowId) {
          const success = await handleStopEditRow();
          if (!success) return;
        }
        setEditingRowId(row.id);
      }

      setVariablesModal({ open: true, rowIndex });
    },
    [
      form,
      editingRowId,
      isViewOnly,
      handleStopEditRow,
      setEditingRowId,
      setVariablesModal,
    ]
  );

  const handleSaveVariables = useCallback(
    (variables: Array<{ id: string; value: string }>) => {
      const { rowIndex } = variablesModal;
      if (rowIndex < 0) return;
      handleCellChange(rowIndex, "variables", variables);
    },
    [variablesModal, handleCellChange]
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
  const columns = useDimensionColumns({
    editingRowId,
    viewOnly: isViewOnly,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onOpenVariables: handleOpenVariables,
    onSubcategoryChange: handleSubcategoryChange,
    rows: currentRows,
    subcategoryOptions,
  });

  const variablesRow =
    variablesModal.rowIndex >= 0
      ? form.getValues(`dimensions.${variablesModal.rowIndex}`)
      : null;

  const isDataReady =
    !isLoadingDimensions &&
    !!dimensionsData &&
    !isLoadingSubcategories &&
    !!subcategories;

  if (
    !isLoadingMethodologies &&
    (isMethodologiesError || isErrorDimensions || !targetMethodology)
  ) {
    const emptyStateMessage = isMethodologiesError
      ? "No fue posible cargar las metodologías."
      : isErrorDimensions
        ? "No fue posible cargar las dimensiones."
        : "No hay metodologías disponibles para mostrar dimensiones.";

    return (
      <>
        <MaintainerPageHeader
          title="Dimensiones / Variables"
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
        title="Dimensiones / Variables"
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
            ? "Vista de solo lectura de las dimensiones de esta metodología."
            : "Gestiona las dimensiones y variables de esta metodología. Haz clic en una fila para editarla."}
        </Typography>
        <form id="dimensions-form" noValidate>
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
              getRowId={(row: DimensionFormRow) => row.id}
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
      <DimensionVariablesModal
        open={variablesModal.open}
        readOnly={isViewOnly}
        subcategoryHasEmissionFactors={!!variablesRow?.subcategoryHasEmissionFactors}
        dimensionName={variablesRow?.name ?? ""}
        isRequired={variablesRow?.isRequired ?? false}
        variables={variablesRow?.variables ?? []}
        onSave={handleSaveVariables}
        onClose={() => setVariablesModal({ open: false, rowIndex: -1 })}
      />
    </FormProvider>
  );
};
