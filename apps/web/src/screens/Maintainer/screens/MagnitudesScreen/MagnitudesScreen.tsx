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
  useMagnitudes,
  useAddMagnitude,
  useUpdateMagnitude,
  useDeleteMagnitude,
} from "@/api/query/maintainer";
import { MagnitudeCreationActionEnum } from "@repo/types";
import { MaintainerPageHeader } from "../../layout/MaintainerPageHeader";
import { MaintainerDataGrid } from "../../components/MaintainerDataGrid";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { UnsavedChangesDialog } from "../../components/UnsavedChangesDialog";
import type { MagnitudesFormRow } from "./hooks/useMagnitudesForm";
import { useMagnitudesForm } from "./hooks/useMagnitudesForm";
import { useMagnitudeColumns } from "./hooks/useMagnitudeColumns";

const MAGNITUDES_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "magnitudes-maintainer",
} as const;

export const MagnitudesScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { data: magnitudes, isLoading, isError } = useMagnitudes();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const addMutation = useAddMagnitude();
  const updateMutation = useUpdateMagnitude();
  const deleteMutation = useDeleteMagnitude();

  const reservedCodes = useMemo(() => {
    const set = new Set<string>();
    if (magnitudes) {
      for (const m of magnitudes) set.add(m.code);
    }
    return set;
  }, [magnitudes]);

  const { form, fieldArray, handleCellChange } =
    useMagnitudesForm(reservedCodes);
  const currentRows = form.watch("magnitudes");

  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!magnitudes) return;
    form.reset({
      magnitudes: magnitudes.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        isSystem: m.isSystem,
        referenceCount: m.referenceCount,
      })),
    });
  }, [magnitudes, form]);

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("magnitudes");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    const isValid = await form.trigger(`magnitudes.${rowIndex}`);
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
          code: row.code,
          name: row.name,
        });

        fieldArray.update(rowIndex, {
          id: result.id,
          code: result.code,
          name: result.name,
          isSystem: result.isSystem,
          referenceCount: result.referenceCount,
        });
        form.reset({ magnitudes: form.getValues("magnitudes") });

        const messagesByAction: Record<typeof result.action, string> = {
          [MagnitudeCreationActionEnum.created]: "Magnitud creada exitosamente",
          [MagnitudeCreationActionEnum.fullyRestored]:
            "Magnitud restaurada exitosamente",
        };
        void enqueueSnackbar({
          message: messagesByAction[result.action],
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear magnitud"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.magnitudes?.[rowIndex];

    try {
      if (isRowDirty?.name) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: { name: row.name },
        });
        form.reset({ magnitudes: form.getValues("magnitudes") });
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

    const rows = form.getValues("magnitudes");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = magnitudes?.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, {
          id: original.id,
          code: original.code,
          name: original.name,
          isSystem: original.isSystem,
          referenceCount: original.referenceCount,
        });
      }
    }

    form.reset({ magnitudes: form.getValues("magnitudes") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, magnitudes]);

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
    const newRow: MagnitudesFormRow = {
      id: tempId,
      code: "",
      name: "",
      isSystem: false,
      referenceCount: 0,
    };
    fieldArray.prepend(newRow);
    setEditingRowId(tempId);
  }, [fieldArray]);

  const handleDelete = useCallback(
    async (row: MagnitudesFormRow) => {
      try {
        const rows = form.getValues("magnitudes");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          if (editingRowId === row.id) setEditingRowId(null);
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ magnitudes: form.getValues("magnitudes") });
          void enqueueSnackbar({
            message: "Magnitud eliminada",
            variant: "success",
          });
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar magnitud"),
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

  const columns = useMagnitudeColumns({
    editingRowId,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    rows: currentRows,
  });

  if (isError) {
    return (
      <>
        <MaintainerPageHeader title="Magnitudes" addDisabled />
        <Box className="rounded-sm bg-white p-3">
          <Typography variant="body2" color="text.secondary">
            No fue posible cargar las magnitudes.
          </Typography>
        </Box>
      </>
    );
  }

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Magnitudes"
        subtitle="Gestiona las magnitudes utilizadas por las unidades de medida. Las magnitudes ya creadas solo permiten editar su nombre. La masa está protegida."
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar magnitud"
        explanationSlug={MAGNITUDES_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      />
      <Box className="flex w-full rounded-sm bg-white p-3">
        <MaintainerDataGrid
          editingRowId={editingRowId}
          getRowHeight={() => 50}
          loading={isLoading}
          columns={columns}
          rows={currentRows}
          getRowId={(row: MagnitudesFormRow) => row.id}
          disableColumnSorting={false}
          hideFooter={false}
          showToolbar
          pagination
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
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
