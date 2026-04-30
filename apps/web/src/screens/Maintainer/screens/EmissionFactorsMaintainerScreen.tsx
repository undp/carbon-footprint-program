import { FC, useCallback, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import {
  useSubcategories,
  useEmissionFactors,
  useEmissionFactorDimensions,
  useAddEmissionFactor,
  useUpdateEmissionFactor,
  useDeleteEmissionFactor,
} from "@/api/query/maintainer";
import { useRateMeasurementUnits } from "@/api/query/measurementUnits/useRateMeasurementUnits";
import {
  useEmissionFactorsForm,
  toFormEmissionFactor,
} from "../hooks/useEmissionFactorsForm";
import { useEmissionFactorColumns } from "../hooks/useEmissionFactorColumns";
import { useMaintainerEditingState } from "../hooks/useMaintainerEditingState";
import { useMaintainerFormSync } from "../hooks/useMaintainerFormSync";
import { useMaintainerExitEditMode } from "../hooks/useMaintainerExitEditMode";
import { useMaintainerMethodologyScope } from "../hooks/useMaintainerMethodologyScope";
import { type EmissionFactorForm } from "@repo/types";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { MaintainerScreenLayout } from "../components/MaintainerScreenLayout";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { GEIBreakdownModal } from "../components/GEIBreakdownModal";

const EMPTY_GAS_DETAILS: EmissionFactorForm["gasDetails"] = {
  CO2_FOSSIL: 0,
  CH4: 0,
  N2O: 0,
  HFC: 0,
  PFC: 0,
  SF6: 0,
  NF3: 0,
};

const gasDetailsEqual = (
  left: EmissionFactorForm["gasDetails"],
  right: EmissionFactorForm["gasDetails"]
) =>
  left.CO2_FOSSIL === right.CO2_FOSSIL &&
  left.CH4 === right.CH4 &&
  left.N2O === right.N2O &&
  left.HFC === right.HFC &&
  left.PFC === right.PFC &&
  left.SF6 === right.SF6 &&
  left.NF3 === right.NF3;

export const EmissionFactorsMaintainerScreen: FC = () => {
  const scope = useMaintainerMethodologyScope();
  const { methodologyVersionId, isMethodologiesError } = scope;
  const { enqueueSnackbar } = useSnackbar();

  // --- Data fetching ---
  const {
    data: emissionFactors,
    isLoading: isLoadingEmissionFactors,
    isError: isErrorEmissionFactors,
  } = useEmissionFactors(methodologyVersionId);
  const {
    data: subcategories,
    isLoading: isLoadingSubcategories,
    isError: isErrorSubcategories,
  } = useSubcategories(methodologyVersionId);
  const {
    data: rateUnits,
    isLoading: isLoadingRateUnits,
    isError: isErrorRateUnits,
  } = useRateMeasurementUnits();
  const {
    data: emissionFactorDimensions,
    isError: isErrorEmissionFactorDimensions,
  } = useEmissionFactorDimensions(methodologyVersionId);

  const dimensionOptionsMap = useMemo(() => {
    const map: Record<
      string,
      {
        dim1: {
          required: boolean;
          values: Array<{ id: string; value: string }>;
        } | null;
        dim2: {
          required: boolean;
          values: Array<{ id: string; value: string }>;
        } | null;
      }
    > = {};
    for (const { subcategoryId, dimensions } of emissionFactorDimensions ??
      []) {
      const dim1 = dimensions.find((d) => d.position === 1);
      const dim2 = dimensions.find((d) => d.position === 2);
      map[subcategoryId] = {
        dim1: dim1 ? { required: dim1.isRequired, values: dim1.values } : null,
        dim2: dim2 ? { required: dim2.isRequired, values: dim2.values } : null,
      };
    }
    return map;
  }, [emissionFactorDimensions]);

  const dimensionRequirements = useMemo(() => {
    const result: Record<
      string,
      { var1Required: boolean; var2Required: boolean }
    > = {};
    for (const subcategoryId of Object.keys(dimensionOptionsMap)) {
      const dims = dimensionOptionsMap[subcategoryId];
      result[subcategoryId] = {
        var1Required: !!dims?.dim1?.required,
        var2Required: !!dims?.dim2?.required,
      };
    }
    return result;
  }, [dimensionOptionsMap]);

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

  // --- Editing state ---
  const {
    editingRowId,
    setEditingRowId,
    exitEditModeOpen,
    setExitEditModeOpen,
    modal: geiModal,
    setModal: setGeiModal,
    isNewRow,
  } = useMaintainerEditingState({ methodologyVersionId });

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  const addMutation = useAddEmissionFactor(methodologyVersionId);
  const updateMutation = useUpdateEmissionFactor(methodologyVersionId);
  const deleteMutation = useDeleteEmissionFactor(methodologyVersionId);

  // --- Form ---
  const { form, fieldArray, handleCellChange } = useEmissionFactorsForm(
    dimensionRequirements
  );
  const currentRows = form.watch("emissionFactors");

  // --- Sync form with server data ---
  const toFormData = useCallback(
    (data: unknown[]) =>
      (data as typeof emissionFactors & object).map(toFormEmissionFactor),
    []
  );
  useMaintainerFormSync({
    form,
    fieldName: "emissionFactors",
    editingRowId,
    methodologyVersionId,
    serverData: emissionFactors,
    toFormData,
  });

  // --- Row editing callbacks ---

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
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(
            error,
            "Error al crear factor de emisión"
          ),
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
      !gasDetailsEqual(row.gasDetails, original.gasDetails);

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
    emissionFactors,
    setEditingRowId,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("emissionFactors");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (rowIndex === -1) {
      setEditingRowId(null);
      return;
    }

    if (isNewRow(editingRowId)) {
      form.reset({
        emissionFactors: rows.filter((_, idx) => idx !== rowIndex),
      });
    } else {
      const original = emissionFactors?.find(({ id }) => id === editingRowId);
      form.reset({
        emissionFactors: original
          ? rows.map((row, idx) =>
              idx === rowIndex ? toFormEmissionFactor(original) : row
            )
          : rows,
      });
    }

    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, emissionFactors, setEditingRowId]);

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
    fieldArray.prepend({
      id: tempId,
      subcategoryId: "",
      dimensionValue1Name: null,
      dimensionValue2Name: null,
      rateMeasurementUnitId: "",
      source: "",
      value: 0,
      gasDetails: EMPTY_GAS_DETAILS,
    });
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
    setEditingRowId(tempId);
  }, [fieldArray, setEditingRowId]);

  const handleDelete = useCallback(
    async (row: EmissionFactorForm) => {
      try {
        const rows = form.getValues("emissionFactors");
        const index = rows.findIndex((currentRow) => currentRow.id === row.id);
        if (index !== -1) {
          const isEditingDeletedRow = editingRowId === row.id;

          if (isNewRow(row.id)) {
            fieldArray.remove(index);
            form.reset({ emissionFactors: form.getValues("emissionFactors") });
            void enqueueSnackbar({
              message: "Factor de emisión eliminado",
              variant: "success",
            });
            if (isEditingDeletedRow) {
              setEditingRowId(null);
            }
            return;
          }

          await deleteMutation.mutateAsync(row.id);
          fieldArray.remove(index);
          form.reset({ emissionFactors: form.getValues("emissionFactors") });
          void enqueueSnackbar({
            message: "Factor de emisión eliminado",
            variant: "success",
          });
          if (isEditingDeletedRow) {
            setEditingRowId(null);
          }
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(
            error,
            "Error al eliminar factor de emisión"
          ),
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

  // --- GEI Breakdown modal ---
  const handleOpenGEIBreakdown = useCallback(
    (rowIndex: number) => {
      setGeiModal({ open: true, rowIndex });
    },
    [setGeiModal]
  );

  const handleSaveGEIBreakdown = useCallback(
    async (gasDetails: EmissionFactorForm["gasDetails"]) => {
      const { rowIndex } = geiModal;
      if (rowIndex < 0) return;

      const previousGasDetails = form.getValues(
        `emissionFactors.${rowIndex}.gasDetails`
      );
      handleCellChange(rowIndex, "gasDetails", gasDetails);

      const row = form.getValues(`emissionFactors.${rowIndex}`);
      if (row && !isNewRow(row.id)) {
        try {
          await updateMutation.mutateAsync({
            emissionFactorId: row.id,
            data: { gasDetails },
          });
          form.reset({ emissionFactors: form.getValues("emissionFactors") });
          void enqueueSnackbar({
            message: "Desglose GEI guardado",
            variant: "success",
          });
        } catch (error) {
          handleCellChange(rowIndex, "gasDetails", previousGasDetails);
          void enqueueSnackbar({
            message: getApiErrorMessage(error, "Error al guardar desglose GEI"),
            variant: "error",
          });
        }
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

  // --- Block navigation while editing ---
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  // --- Column definitions ---
  const getEmissionFactorValues = useCallback(
    () => form.getValues("emissionFactors"),
    [form]
  );
  const columns = useEmissionFactorColumns({
    editingRowId,
    viewOnly: scope.isViewOnly,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onOpenGEIBreakdown: handleOpenGEIBreakdown,
    getValues: getEmissionFactorValues,
    subcategories: subcategoryOptions,
    rateUnits: rateUnitOptions,
    dimensionOptionsMap,
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

  const isAnyError =
    isMethodologiesError ||
    isErrorEmissionFactors ||
    isErrorSubcategories ||
    isErrorRateUnits ||
    isErrorEmissionFactorDimensions;

  const errorMessage = isAnyError
    ? "No fue posible cargar los datos."
    : !scope.targetMethodology
      ? "No hay metodologías disponibles para mostrar factores de emisión."
      : null;

  return (
    <MaintainerScreenLayout
      title="Factores de emisión"
      scope={scope}
      editingRowId={editingRowId}
      form={form}
      formId="emission-factors-form"
      errorMessage={errorMessage}
      onAddRow={handleAddRow}
      addDisabled={editingRowId !== null || !isDataReady}
      onExitEditMode={handleExitEditMode}
      exitEditModeOpen={exitEditModeOpen}
      onExitEditModeOpenChange={setExitEditModeOpen}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      readOnlyDescription="Vista de solo lectura de los factores de emisión de esta metodología."
      editDescription="Gestiona los factores de emisión de esta metodología. Haz clic en una fila para editarla."
      extraModals={
        <GEIBreakdownModal
          open={geiModal.open}
          gasDetails={geiGasDetails ?? EMPTY_GAS_DETAILS}
          declaredValue={geiDeclaredValue}
          readOnly={scope.isViewOnly}
          onSave={handleSaveGEIBreakdown}
          onClose={() => setGeiModal({ open: false, rowIndex: -1 })}
        />
      }
    >
      <MaintainerDataGrid
        editingRowId={editingRowId}
        cellMaxHeight={60}
        columns={columns}
        rows={currentRows}
        loading={!isDataReady}
        getRowId={(row: EmissionFactorForm) => row.id}
        hideFooter={false}
        pageSizeOptions={[25, 50, 100]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />
    </MaintainerScreenLayout>
  );
};
