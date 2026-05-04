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
import { FormProvider } from "react-hook-form";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import {
  useMaintainerMeasurementUnits,
  useAddMeasurementUnit,
  useUpdateMeasurementUnit,
  useDeleteMeasurementUnit,
} from "@/api/query/maintainer";
import { MaintainerPageHeader } from "../../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../../components/MaintainerDataGrid";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../../components/UnsavedChangesDialog";
import {
  MeasurementUnitsFormRow,
  useMeasurementUnitsForm,
} from "./hooks/useMeasurementUnitsForm";
import { useMeasurementUnitColumns } from "./hooks/useMeasurementUnitColumns";
import { Magnitude, MeasurementUnitCreationResultEnum } from "@repo/types";

export const MeasurementUnitsScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: measurementUnits,
    isLoading,
    isError,
  } = useMaintainerMeasurementUnits();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const addMutation = useAddMeasurementUnit();
  const updateMutation = useUpdateMeasurementUnit();
  const deleteMutation = useDeleteMeasurementUnit();

  const { form, fieldArray, handleCellChange } = useMeasurementUnitsForm();
  const currentRows = form.watch("measurementUnits");

  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!measurementUnits) return;
    form.reset({
      measurementUnits: measurementUnits.map((mu) => ({
        id: mu.id,
        name: mu.name,
        abbreviation: mu.abbreviation,
        magnitude: mu.magnitude,
        baseFactor: mu.baseFactor,
        isBase: mu.isBase,
        referenceCount: mu.referenceCount,
      })),
    });
  }, [measurementUnits, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("measurementUnits");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    const isValid = await form.trigger(`measurementUnits.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (!row) return false;

    if (isNewRow(row.id)) {
      try {
        const result = await addMutation.mutateAsync({
          name: row.name,
          abbreviation: row.abbreviation,
          magnitude: row.magnitude,
          baseFactor: row.baseFactor!,
          isBase: row.isBase,
        });

        fieldArray.update(rowIndex, {
          id: result.id,
          name: result.name,
          abbreviation: result.abbreviation,
          magnitude: result.magnitude,
          baseFactor: result.baseFactor,
          isBase: result.isBase,
          referenceCount: result.referenceCount,
        });
        form.reset({ measurementUnits: form.getValues("measurementUnits") });

        const msg =
          result.action === MeasurementUnitCreationResultEnum.created
            ? "Unidad creada exitosamente"
            : "Unidad restaurada exitosamente";
        void enqueueSnackbar({ message: msg, variant: "success" });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear unidad"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.measurementUnits?.[rowIndex];

    try {
      if (isRowDirty) {
        const updateData: {
          name?: string;
          abbreviation?: string;
          magnitude?: MeasurementUnitsFormRow["magnitude"];
          baseFactor?: number;
          isBase?: boolean;
        } = {};

        if (dirtyFields.measurementUnits?.[rowIndex]?.name)
          updateData.name = row.name;
        if (dirtyFields.measurementUnits?.[rowIndex]?.abbreviation)
          updateData.abbreviation = row.abbreviation;
        if (dirtyFields.measurementUnits?.[rowIndex]?.magnitude)
          updateData.magnitude = row.magnitude;
        if (dirtyFields.measurementUnits?.[rowIndex]?.baseFactor)
          updateData.baseFactor = row.baseFactor!;
        if (dirtyFields.measurementUnits?.[rowIndex]?.isBase)
          updateData.isBase = row.isBase;

        await updateMutation.mutateAsync({ id: row.id, data: updateData });
        form.reset({ measurementUnits: form.getValues("measurementUnits") });
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
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("measurementUnits");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = measurementUnits?.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, {
          id: original.id,
          name: original.name,
          abbreviation: original.abbreviation,
          magnitude: original.magnitude,
          baseFactor: original.baseFactor,
          isBase: original.isBase,
          referenceCount: original.referenceCount,
        });
      }
    }

    form.reset({ measurementUnits: form.getValues("measurementUnits") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, measurementUnits]);

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
    const newRow: MeasurementUnitsFormRow = {
      id: tempId,
      name: "",
      abbreviation: "",
      magnitude: Magnitude.ANIMALS,
      baseFactor: null,
      isBase: false,
      referenceCount: 0,
    };
    fieldArray.prepend(newRow);
    setEditingRowId(tempId);
  }, [fieldArray]);

  const handleDelete = useCallback(
    async (row: MeasurementUnitsFormRow) => {
      try {
        const rows = form.getValues("measurementUnits");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) setEditingRowId(null);
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ measurementUnits: form.getValues("measurementUnits") });
          void enqueueSnackbar({
            message: "Unidad eliminada",
            variant: "success",
          });
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar unidad"),
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, isNewRow, deleteMutation, enqueueSnackbar]
  );

  useEffect(() => {
    if (!editingRowId?.startsWith("temp_")) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [editingRowId]);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  const columns = useMeasurementUnitColumns({
    editingRowId,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    rows: currentRows,
  });

  const sortModel = useMemo(
    () => [
      { field: "magnitude", sort: "asc" as const },
      { field: "name", sort: "asc" as const },
    ],
    []
  );

  if (isError) {
    return (
      <>
        <MaintainerPageHeader title="Unidades de medida" addDisabled />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            No fue posible cargar las unidades de medida.
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Unidades de medida"
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar unidad"
      />
      <Box className="rounded-sm bg-white p-3">
        <Typography variant="body2" color="text.secondary" sx={{ m: 2 }}>
          Gestiona las unidades de medida. Haz clic en editar para modificar una
          fila.
        </Typography>
        <Box className="flex w-full">
          <MaintainerDataGrid
            editingRowId={editingRowId}
            loading={isLoading}
            columns={columns}
            rows={currentRows}
            getRowId={(row: MeasurementUnitsFormRow) => row.id}
            disableColumnSorting={false}
            hideFooter={false}
            pagination
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              sorting: { sortModel },
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            disableDensitySelector
          />
        </Box>
      </Box>
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
    </FormProvider>
  );
};
