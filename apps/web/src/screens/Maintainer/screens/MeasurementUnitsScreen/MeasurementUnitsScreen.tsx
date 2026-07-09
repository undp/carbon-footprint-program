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
import { Box } from "@mui/material";
import { useSnackbar } from "notistack";
import {
  useMaintainerMeasurementUnits,
  useAddMeasurementUnit,
  useUpdateMeasurementUnit,
  useDeleteMeasurementUnit,
  useMagnitudes,
} from "@/api/query/maintainer";
import { MaintainerPageHeader } from "../../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../../components/MaintainerDataGrid";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../../components/UnsavedChangesDialog";
import type { MeasurementUnitsFormRow } from "./hooks/useMeasurementUnitsForm";
import { useMeasurementUnitsForm } from "./hooks/useMeasurementUnitsForm";
import { useMeasurementUnitColumns } from "./hooks/useMeasurementUnitColumns";
import { MeasurementUnitCreationResultEnum } from "@repo/types";

const MEASUREMENT_UNITS_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "measurement-units-maintainer",
} as const;

export const MeasurementUnitsScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: measurementUnits,
    isLoading,
    isError,
  } = useMaintainerMeasurementUnits();

  const {
    data: magnitudes,
    isLoading: isMagnitudesLoading,
    isError: isMagnitudesError,
  } = useMagnitudes();

  const magnitudeOptions = useMemo(
    () => (magnitudes ?? []).map((m) => ({ id: m.id, name: m.name })),
    [magnitudes]
  );

  // Display lookup that merges names from the MU payload (which includes
  // joined names for soft-deleted magnitudes) with the active-magnitudes list
  // (picker). MU payload wins so it stays in sync with the latest server data.
  const magnitudeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of magnitudes ?? []) map.set(m.id, m.name);
    for (const mu of measurementUnits ?? [])
      map.set(mu.magnitude.id, mu.magnitude.name);
    return map;
  }, [magnitudes, measurementUnits]);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const addMutation = useAddMeasurementUnit();
  const updateMutation = useUpdateMeasurementUnit();
  const deleteMutation = useDeleteMeasurementUnit();

  const magnitudesWithBaseUnit = useMemo(() => {
    const set = new Set<string>();
    if (measurementUnits) {
      for (const mu of measurementUnits) {
        if (mu.isBase) set.add(mu.magnitudeId);
      }
    }
    return set;
  }, [measurementUnits]);

  const { form, fieldArray, handleCellChange } = useMeasurementUnitsForm(
    magnitudesWithBaseUnit
  );
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
        magnitudeId: mu.magnitudeId,
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
          magnitudeId: row.magnitudeId,
          baseFactor: row.baseFactor!,
          isBase: row.isBase,
        });

        fieldArray.update(rowIndex, {
          id: result.id,
          name: result.name,
          abbreviation: result.abbreviation,
          magnitudeId: result.magnitudeId,
          baseFactor: result.baseFactor,
          isBase: result.isBase,
          referenceCount: result.referenceCount,
        });
        form.reset({ measurementUnits: form.getValues("measurementUnits") });

        const messagesByAction = {
          [MeasurementUnitCreationResultEnum.created]:
            "Unidad creada exitosamente",
          [MeasurementUnitCreationResultEnum.fullyRestored]:
            "Unidad restaurada exitosamente",
          [MeasurementUnitCreationResultEnum.restoredLabelsOnly]:
            "Unidad restaurada: solo etiquetas aplicadas, otros campos no modificados",
        };
        void enqueueSnackbar({
          message: messagesByAction[result.action],
          variant: "success",
        });
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
          magnitudeId?: string;
          baseFactor?: number;
          isBase?: boolean;
        } = {};

        if (dirtyFields.measurementUnits?.[rowIndex]?.name)
          updateData.name = row.name;
        if (dirtyFields.measurementUnits?.[rowIndex]?.abbreviation)
          updateData.abbreviation = row.abbreviation;
        if (dirtyFields.measurementUnits?.[rowIndex]?.magnitudeId)
          updateData.magnitudeId = row.magnitudeId;
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
          magnitudeId: original.magnitudeId,
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
    if (isMagnitudesLoading) return;
    if (magnitudeOptions.length === 0) {
      void enqueueSnackbar({
        message:
          "No hay magnitudes disponibles. Crea al menos una magnitud antes de agregar una unidad.",
        variant: "warning",
      });
      return;
    }
    const tempId = `temp_${Date.now()}`;
    const newRow: MeasurementUnitsFormRow = {
      id: tempId,
      name: "",
      abbreviation: "",
      magnitudeId: "",
      baseFactor: null,
      isBase: false,
      referenceCount: 0,
    };
    fieldArray.prepend(newRow);
    setEditingRowId(tempId);
  }, [fieldArray, magnitudeOptions, isMagnitudesLoading, enqueueSnackbar]);

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
    magnitudeOptions,
    magnitudeNameById,
  });

  const sortModel = useMemo(
    () => [
      { field: "magnitudeId", sort: "asc" as const },
      { field: "name", sort: "asc" as const },
    ],
    []
  );

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Unidades de medida"
        subtitle="Gestiona las unidades de medida. Haz clic en editar para modificar una fila"
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null || isMagnitudesLoading}
        addLabel="Agregar unidad"
        explanationSlug={MEASUREMENT_UNITS_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      />
      <Box className="flex w-full rounded-sm bg-white p-3">
        <MaintainerDataGrid<MeasurementUnitsFormRow>
          errorMessage={
            isError
              ? "Ocurrió un problema al cargar las unidades de medida"
              : isMagnitudesError
                ? "Ocurrió un problema al cargar las magnitudes"
                : undefined
          }
          editingRowId={editingRowId}
          searchable={{
            fuseOptions: {
              keys: [
                {
                  name: "magnitudeId",
                  getFn: (row) =>
                    magnitudeNameById.get(row.magnitudeId) ?? row.magnitudeId,
                },
                "name",
                "abbreviation",
              ],
            },
            placeholder: "Buscar unidad...",
            downloadFileName: "unidades-de-medida",
          }}
          showToolbar
          loading={isLoading || isMagnitudesLoading}
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
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
    </FormProvider>
  );
};
