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
  useEmissionFactors,
  useAddEmissionFactor,
  useUpdateEmissionFactor,
  useDeleteEmissionFactor,
} from "@/api/query/maintainer";
import { useRateMeasurementUnits } from "@/api/query/measurementUnits/useRateMeasurementUnits";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import {
  useEmissionFactorsForm,
  toFormEmissionFactor,
} from "../hooks/useEmissionFactorsForm";
import { useEmissionFactorColumns } from "../hooks/useEmissionFactorColumns";
import { type EmissionFactorForm } from "@repo/types";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { ExitEditModeDialog } from "../components/ExitEditModeDialog";
import { InfoBanner } from "../components/InfoBanner";
import { GEIBreakdownModal } from "../components/GEIBreakdownModal";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";

const EMPTY_GAS_DETAILS: EmissionFactorForm["gasDetails"] = {
  CO2_FOSSIL: 0,
  CH4: 0,
  N2O: 0,
  HFC: 0,
  PFC: 0,
  SF6: 0,
  NF3: 0,
};

export const EmissionFactorsMaintainerScreen: FC = () => {
  const {
    isViewOnly,
    methodologies,
    effectiveMethodologyId,
    methodologyVersionId,
    targetMethodology,
    methodologySelector,
    selectMethodology,
    stopEditing,
    isMethodologiesError,
  } = useMaintainerMethodologyScope();
  const { enqueueSnackbar } = useSnackbar();

  const { data: emissionFactors, isLoading: isLoadingEmissionFactors } =
    useEmissionFactors(methodologyVersionId);
  const { data: subcategories, isLoading: isLoadingSubcategories } =
    useSubcategories(methodologyVersionId);
  const { data: rateUnits, isLoading: isLoadingRateUnits } =
    useRateMeasurementUnits();

  const subcategoryOptions = useMemo(
    () =>
      subcategories?.map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        categoryName: subcategory.category.name,
        measurementUnitIds: subcategory.measurementUnits.map(
          (measurementUnit) => measurementUnit.id
        ),
      })) ?? [],
    [subcategories]
  );

  const rateUnitOptions = useMemo(
    () =>
      rateUnits?.map((rateUnit) => ({
        id: rateUnit.id,
        name: rateUnit.name,
        abbreviation: rateUnit.abbreviation,
        denominatorUnitId: rateUnit.denominatorUnit.id,
      })) ?? [],
    [rateUnits]
  );

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
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [geiModalState, setGeiModalState] = useState<{
    methodologyVersionId?: string;
    open: boolean;
    rowIndex: number;
  }>({ methodologyVersionId: undefined, open: false, rowIndex: -1 });
  const geiModal = useMemo(
    () =>
      geiModalState.methodologyVersionId === methodologyVersionId
        ? {
            open: geiModalState.open,
            rowIndex: geiModalState.rowIndex,
          }
        : { open: false, rowIndex: -1 },
    [geiModalState, methodologyVersionId]
  );
  const setGeiModal = useCallback(
    (value: { open: boolean; rowIndex: number }) => {
      setGeiModalState({ methodologyVersionId, ...value });
    },
    [methodologyVersionId]
  );

  const addMutation = useAddEmissionFactor(methodologyVersionId);
  const updateMutation = useUpdateEmissionFactor(methodologyVersionId);
  const deleteMutation = useDeleteEmissionFactor(methodologyVersionId);

  const { form, fieldArray, handleCellChange } = useEmissionFactorsForm([]);
  const currentRows = form.watch("emissionFactors");

  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    form.reset({ emissionFactors: [] });
  }, [methodologyVersionId, form]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!emissionFactors) return;
    form.reset({
      emissionFactors: emissionFactors.map(toFormEmissionFactor),
    });
  }, [emissionFactors, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("emissionFactors");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    if (rowIndex === -1) {
      setEditingRowId(null);
      return true;
    }

    const row = rows[rowIndex];
    const isValid = await form.trigger(`emissionFactors.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (isNewRow(row.id)) {
      try {
        const result = await addMutation.mutateAsync({
          subcategoryId: row.subcategoryId,
          dimensionValue1Name: row.dimensionValue1Name || null,
          dimensionValue2Name: row.dimensionValue2Name || null,
          rateMeasurementUnitId: row.rateMeasurementUnitId,
          source: row.source,
          gasDetails: row.gasDetails,
          value: row.value,
        });
        fieldArray.update(rowIndex, toFormEmissionFactor(result));
        form.reset({ emissionFactors: form.getValues("emissionFactors") });
        void enqueueSnackbar({
          message: "Factor de emisión creado exitosamente",
          variant: "success",
        });
      } catch {
        void enqueueSnackbar({
          message: "Error al crear factor de emisión",
          variant: "error",
        });
        return false;
      }

      setEditingRowId(null);
      return true;
    }

    const serverRow = emissionFactors?.find(({ id }) => id === editingRowId);
    const original = serverRow ? toFormEmissionFactor(serverRow) : null;
    const hasRealChanges =
      !original ||
      row.subcategoryId !== original.subcategoryId ||
      row.dimensionValue1Name !== original.dimensionValue1Name ||
      row.dimensionValue2Name !== original.dimensionValue2Name ||
      row.rateMeasurementUnitId !== original.rateMeasurementUnitId ||
      row.source !== original.source ||
      row.value !== original.value ||
      JSON.stringify(row.gasDetails) !== JSON.stringify(original.gasDetails);

    try {
      if (hasRealChanges) {
        await updateMutation.mutateAsync({
          emissionFactorId: row.id,
          data: {
            subcategoryId: row.subcategoryId,
            dimensionValue1Name: row.dimensionValue1Name || null,
            dimensionValue2Name: row.dimensionValue2Name || null,
            rateMeasurementUnitId: row.rateMeasurementUnitId,
            source: row.source,
            gasDetails: row.gasDetails,
            value: row.value,
          },
        });
        form.reset({ emissionFactors: form.getValues("emissionFactors") });
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
    emissionFactors,
    setEditingRowId,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("emissionFactors");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = emissionFactors?.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormEmissionFactor(original));
      }
    }

    form.reset({ emissionFactors: form.getValues("emissionFactors") });
    setEditingRowId(null);
  }, [
    editingRowId,
    form,
    isNewRow,
    fieldArray,
    emissionFactors,
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
    const currentCount = form.getValues("emissionFactors").length;
    const totalAfterAppend = currentCount + 1;
    const lastPage = Math.max(
      0,
      Math.ceil(totalAfterAppend / paginationModel.pageSize) - 1
    );

    fieldArray.append({
      id: tempId,
      subcategoryId: "",
      dimensionValue1Name: null,
      dimensionValue2Name: null,
      rateMeasurementUnitId: "",
      source: "",
      value: 0,
      gasDetails: EMPTY_GAS_DETAILS,
    });
    setPaginationModel((prev) => ({ ...prev, page: lastPage }));
    setEditingRowId(tempId);
  }, [fieldArray, form, paginationModel.pageSize, setEditingRowId]);

  const handleDelete = useCallback(
    async (row: EmissionFactorForm) => {
      try {
        const rows = form.getValues("emissionFactors");
        const index = rows.findIndex((currentRow) => currentRow.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) {
            setEditingRowId(null);
          }
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ emissionFactors: form.getValues("emissionFactors") });
          void enqueueSnackbar({
            message: "Factor de emisión eliminado",
            variant: "success",
          });
        }
      } catch {
        void enqueueSnackbar({
          message: "Error al eliminar factor de emisión",
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

  const handleOpenGEIBreakdown = useCallback(
    (rowIndex: number) => {
      setGeiModal({ open: true, rowIndex });
    },
    [setGeiModal]
  );

  const handleSaveGEIBreakdown = useCallback(
    (gasDetails: EmissionFactorForm["gasDetails"]) => {
      const { rowIndex } = geiModal;
      if (rowIndex < 0) return;

      handleCellChange(rowIndex, "gasDetails", gasDetails);

      const row = form.getValues(`emissionFactors.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        void updateMutation
          .mutateAsync({
            emissionFactorId: row.id,
            data: { gasDetails },
          })
          .then(() => {
            form.reset({ emissionFactors: form.getValues("emissionFactors") });
            void enqueueSnackbar({
              message: "Desglose GEI guardado",
              variant: "success",
            });
          })
          .catch(() => {
            void enqueueSnackbar({
              message: "Error al guardar desglose GEI",
              variant: "error",
            });
          });
      }
    },
    [
      geiModal,
      handleCellChange,
      form,
      isNewRow,
      updateMutation,
      enqueueSnackbar,
    ]
  );

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => editingRowId !== null,
    withResolver: true,
  });

  const columns = useEmissionFactorColumns({
    editingRowId,
    viewOnly: isViewOnly,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onOpenGEIBreakdown: handleOpenGEIBreakdown,
    rows: currentRows,
    subcategories: subcategoryOptions,
    rateUnits: rateUnitOptions,
  });

  const geiGasDetails =
    geiModal.rowIndex >= 0
      ? form.getValues(`emissionFactors.${geiModal.rowIndex}.gasDetails`)
      : undefined;
  const geiDeclaredValue =
    geiModal.rowIndex >= 0
      ? Number(form.getValues(`emissionFactors.${geiModal.rowIndex}.value`))
      : 0;

  const isDataReady =
    !isLoadingEmissionFactors &&
    !!emissionFactors &&
    !isLoadingSubcategories &&
    !!subcategories &&
    !isLoadingRateUnits &&
    !!rateUnits;

  if (methodologies.length === 0 || !targetMethodology) {
    const emptyStateMessage = isMethodologiesError
      ? "No fue posible cargar las metodologías."
      : methodologies.length === 0
        ? "No hay metodologías disponibles para mostrar factores de emisión."
        : "La metodología seleccionada no está disponible.";

    return (
      <>
        <MaintainerPageHeader
          title="Factores de emisión"
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
        title="Factores de emisión"
        onAddRow={isViewOnly ? undefined : handleAddRow}
        addDisabled={editingRowId !== null || !isDataReady}
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
            ? "Vista de solo lectura de los factores de emisión de esta metodología."
            : "Gestiona los factores de emisión de esta metodología. Haz clic en una fila para editarla."}
        </Typography>
        <form id="emission-factors-form" noValidate>
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
              loading={!isDataReady}
              getRowHeight={() => 60}
              getRowId={(row: EmissionFactorForm) => row.id}
              getRowClassName={({ id }) =>
                String(id) === editingRowId ? "row--editing" : ""
              }
              hideFooter={false}
              pageSizeOptions={[25, 50, 100]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
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
      <GEIBreakdownModal
        open={geiModal.open}
        gasDetails={geiGasDetails ?? EMPTY_GAS_DETAILS}
        declaredValue={geiDeclaredValue}
        readOnly={isViewOnly}
        onSave={handleSaveGEIBreakdown}
        onClose={() => setGeiModal({ open: false, rowIndex: -1 })}
      />
    </FormProvider>
  );
};
