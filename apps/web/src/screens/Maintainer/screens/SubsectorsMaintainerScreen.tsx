import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import {
  CountrySubsectorStatus,
  type AdminCountrySubsector,
  type AdminListStatusFilter,
  type CreateCountrySubsectorRequest,
  type UpdateCountrySubsectorRequest,
} from "@repo/types";
import {
  useAdminCountrySubsectors,
  useCreateCountrySubsector,
  useUpdateCountrySubsector,
  useSoftDeleteCountrySubsector,
  useRestoreCountrySubsector,
} from "@/api/query/countrySubsectors";
import { useAdminCountrySectors } from "@/api/query/countrySectors";
import { ProfilingMaintainerScreenLayout } from "../components/ProfilingMaintainerScreenLayout";
import { MaintainerStatusFilterToggle } from "../components/MaintainerStatusFilterToggle";
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToLastPageOnAdd } from "../hooks/useJumpToLastPageOnAdd";
import {
  useSubsectorProfilingColumns,
  type SubsectorFormRow,
} from "../hooks/useSubsectorProfilingColumns";

const RowSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(255, "El nombre no puede superar los 255 caracteres"),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción no puede superar los 2000 caracteres")
    .nullable(),
  countrySectorId: z.string().min(1, "El rubro es obligatorio"),
  status: z.enum(CountrySubsectorStatus),
  isInUse: z.boolean(),
});
const FormSchema = z.object({ subsectors: z.array(RowSchema) });
type FormValues = z.infer<typeof FormSchema>;

const toFormSubsector = (s: AdminCountrySubsector): SubsectorFormRow => ({
  id: s.id,
  name: s.name,
  description: s.description,
  countrySectorId: s.countrySectorId,
  status: s.status,
  isInUse: s.isInUse,
});

export const SubsectorsMaintainerScreen: FC = () => {
  const [statusFilter, setStatusFilter] =
    useState<AdminListStatusFilter>("active");

  const { data: rows, isLoading } = useAdminCountrySubsectors(statusFilter);
  const { data: activeSectors } = useAdminCountrySectors("active");
  const createMutation = useCreateCountrySubsector();
  const updateMutation = useUpdateCountrySubsector();
  const deleteMutation = useSoftDeleteCountrySubsector();
  const restoreMutation = useRestoreCountrySubsector();

  const sectorOptions = useMemo(
    () => (activeSectors ?? []).map((s) => ({ id: s.id, name: s.name })),
    [activeSectors]
  );
  const noSectors = sectorOptions.length === 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { subsectors: [] },
    mode: "onBlur",
  });
  const fieldArray = useFieldArray({
    control: form.control,
    name: "subsectors",
  });
  const { editingRowId, setEditingRowId, isNewRow } =
    useProfilingEditingState();

  const toFormData = useCallback(
    (data: unknown[]) => (data as AdminCountrySubsector[]).map(toFormSubsector),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "subsectors",
    editingRowId,
    serverData: rows,
    toFormData,
  });

  const handleCellChange = useCallback(
    (
      rowIndex: number,
      field: "name" | "description" | "countrySectorId",
      value: string | null
    ) => {
      const next =
        field === "description" &&
        typeof value === "string" &&
        value.trim() === ""
          ? null
          : value;
      form.setValue(
        `subsectors.${rowIndex}.${field}` as `subsectors.${number}.name`,
        next as never,
        { shouldDirty: true }
      );
      void form.trigger(
        `subsectors.${rowIndex}.${field}` as `subsectors.${number}.name`
      );
    },
    [form]
  );

  const actions = useProfilingRowActions<
    FormValues,
    AdminCountrySubsector,
    SubsectorFormRow,
    CreateCountrySubsectorRequest,
    UpdateCountrySubsectorRequest
  >({
    form,
    fieldArray,
    fieldName: "subsectors",
    serverRows: rows,
    toFormRow: toFormSubsector,
    toCreateBody: (row) => ({
      name: row.name,
      description: row.description ?? null,
      countrySectorId: row.countrySectorId,
    }),
    diffUpdateBody: (formRow, serverRow) => {
      const body: UpdateCountrySubsectorRequest = {};
      if (formRow.name !== serverRow.name) body.name = formRow.name;
      if (formRow.description !== serverRow.description)
        body.description = formRow.description;
      if (formRow.countrySectorId !== serverRow.countrySectorId)
        body.countrySectorId = formRow.countrySectorId;
      return Object.keys(body).length === 0 ? null : body;
    },
    visibleFieldsChanged: (body) =>
      body.name !== undefined || body.countrySectorId !== undefined,
    newRowDefaults: () => ({
      id: `temp_${Date.now()}`,
      name: "",
      description: null,
      countrySectorId: sectorOptions[0]?.id ?? "",
      status: CountrySubsectorStatus.ACTIVE,
      isInUse: false,
    }),
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
    editingRowId,
    setEditingRowId,
    isNewRow,
    successMessages: {
      create: "Subrubro creado exitosamente",
      update: "Cambios guardados satisfactoriamente",
      delete: "Subrubro eliminado",
      restore: "Subrubro restaurado",
    },
    errorMessages: {
      create: "No se pudo crear el subrubro",
      update: "No se pudo guardar el subrubro",
      delete: "No se pudo eliminar el subrubro",
      restore: "No se pudo restaurar el subrubro",
    },
  });

  const currentRows = useWatch({ control: form.control, name: "subsectors" });

  const columns = useSubsectorProfilingColumns({
    editingRowId,
    rows: currentRows,
    sectorOptions,
    onCellChange: handleCellChange,
    onStartEditRow: actions.handleStartEditRow,
    onStopEditRow: actions.handleStopEditRow,
    onCancelEditRow: actions.handleCancelEditRow,
    onDelete: actions.handleDelete,
    onRestore: actions.handleRestore,
    restoreDisabled: restoreMutation.isPending,
  });

  const { paginationModel, setPaginationModel, jumpToLastPage } =
    useJumpToLastPageOnAdd();

  const handleAddRow = useCallback(() => {
    actions.handleAddRow();
    jumpToLastPage(currentRows.length + 1);
  }, [actions, jumpToLastPage, currentRows.length]);

  useEffect(() => {
    if (!editingRowId?.startsWith("temp_")) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }, [editingRowId]);

  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  const isEmpty = !isLoading && (!rows || rows.length === 0);

  return (
    <ProfilingMaintainerScreenLayout
      title="Subrubros"
      addLabel="Agregar subrubro"
      onAddRow={handleAddRow}
      addDisabled={noSectors || editingRowId !== null}
      statusFilter={
        <MaintainerStatusFilterToggle
          value={statusFilter}
          onChange={setStatusFilter}
          disabled={editingRowId !== null}
        />
      }
      form={form}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      extraDialogs={
        <InUseWarningDialog
          open={actions.pendingPatch !== null}
          entityLabel="subrubro"
          onCancel={actions.cancelPendingPatch}
          onConfirm={actions.dispatchPendingPatch}
        />
      }
    >
      <Box sx={{ width: "100%" }}>
        {noSectors && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Crea primero un rubro antes de agregar subrubros.
          </Typography>
        )}
        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4 }}>
            No hay subrubros para mostrar.
          </Typography>
        ) : (
          <MaintainerDataGrid
            editingRowId={editingRowId}
            columns={columns}
            rows={currentRows}
            loading={isLoading}
            getRowId={(row: SubsectorFormRow) => row.id}
            hideFooter={false}
            pagination
            pageSizeOptions={[10, 25, 50, 100]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            showToolbar
            disableColumnFilter={false}
            disableColumnSorting={false}
            disableColumnMenu={false}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
