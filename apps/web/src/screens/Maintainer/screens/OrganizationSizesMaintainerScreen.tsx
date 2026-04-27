import { FC, useCallback, useEffect, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import {
  CountryOrganizationSizeStatus,
  type AdminCountryOrganizationSize,
  type AdminListStatusFilter,
  type CreateCountryOrganizationSizeRequest,
  type UpdateCountryOrganizationSizeRequest,
} from "@repo/types";
import {
  useAdminCountryOrganizationSizes,
  useCreateCountryOrganizationSize,
  useUpdateCountryOrganizationSize,
  useSoftDeleteCountryOrganizationSize,
  useRestoreCountryOrganizationSize,
} from "@/api/query/countryOrganizationSizes";
import { ProfilingMaintainerScreenLayout } from "../components/ProfilingMaintainerScreenLayout";
import { MaintainerStatusFilterToggle } from "../components/MaintainerStatusFilterToggle";
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToLastPageOnAdd } from "../hooks/useJumpToLastPageOnAdd";
import {
  useOrganizationSizeProfilingColumns,
  type OrganizationSizeFormRow,
} from "../hooks/useOrganizationSizeProfilingColumns";

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
  status: z.enum(CountryOrganizationSizeStatus),
  isInUse: z.boolean(),
});
const FormSchema = z.object({ organizationSizes: z.array(RowSchema) });
type FormValues = z.infer<typeof FormSchema>;

const toFormSize = (
  s: AdminCountryOrganizationSize
): OrganizationSizeFormRow => ({
  id: s.id,
  name: s.name,
  description: s.description,
  status: s.status,
  isInUse: s.isInUse,
});

export const OrganizationSizesMaintainerScreen: FC = () => {
  const [statusFilter, setStatusFilter] =
    useState<AdminListStatusFilter>("active");

  const { data: rows, isLoading } =
    useAdminCountryOrganizationSizes(statusFilter);
  const createMutation = useCreateCountryOrganizationSize();
  const updateMutation = useUpdateCountryOrganizationSize();
  const deleteMutation = useSoftDeleteCountryOrganizationSize();
  const restoreMutation = useRestoreCountryOrganizationSize();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { organizationSizes: [] },
    mode: "onBlur",
  });
  const fieldArray = useFieldArray({
    control: form.control,
    name: "organizationSizes",
  });
  const { editingRowId, setEditingRowId, isNewRow } =
    useProfilingEditingState();

  const toFormData = useCallback(
    (data: unknown[]) =>
      (data as AdminCountryOrganizationSize[]).map(toFormSize),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "organizationSizes",
    editingRowId,
    serverData: rows,
    toFormData,
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: "name" | "description", value: string) => {
      const next =
        field === "description" && value.trim() === "" ? null : value;
      form.setValue(
        `organizationSizes.${rowIndex}.${field}` as `organizationSizes.${number}.name`,
        next as never,
        { shouldDirty: true }
      );
      void form.trigger(
        `organizationSizes.${rowIndex}.${field}` as `organizationSizes.${number}.name`
      );
    },
    [form]
  );

  const actions = useProfilingRowActions<
    FormValues,
    AdminCountryOrganizationSize,
    OrganizationSizeFormRow,
    CreateCountryOrganizationSizeRequest,
    UpdateCountryOrganizationSizeRequest
  >({
    form,
    fieldArray,
    fieldName: "organizationSizes",
    serverRows: rows,
    toFormRow: toFormSize,
    toCreateBody: (row) => ({
      name: row.name,
      description: row.description ?? null,
    }),
    diffUpdateBody: (formRow, serverRow) => {
      const body: UpdateCountryOrganizationSizeRequest = {};
      if (formRow.name !== serverRow.name) body.name = formRow.name;
      if (formRow.description !== serverRow.description)
        body.description = formRow.description;
      return Object.keys(body).length === 0 ? null : body;
    },
    visibleFieldsChanged: (body) => body.name !== undefined,
    newRowDefaults: () => ({
      id: `temp_${Date.now()}`,
      name: "",
      description: null,
      status: CountryOrganizationSizeStatus.ACTIVE,
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
      create: "Tamaño creado exitosamente",
      update: "Cambios guardados satisfactoriamente",
      delete: "Tamaño eliminado",
      restore: "Tamaño restaurado",
    },
    errorMessages: {
      create: "No se pudo crear el tamaño",
      update: "No se pudo guardar el tamaño",
      delete: "No se pudo eliminar el tamaño",
      restore: "No se pudo restaurar el tamaño",
    },
  });

  const currentRows = useWatch({
    control: form.control,
    name: "organizationSizes",
  });

  const columns = useOrganizationSizeProfilingColumns({
    editingRowId,
    rows: currentRows,
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
      title="Tamaño de la Organización"
      addLabel="Agregar tamaño"
      onAddRow={handleAddRow}
      addDisabled={editingRowId !== null}
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
          entityLabel="tamaño"
          onCancel={actions.cancelPendingPatch}
          onConfirm={actions.dispatchPendingPatch}
        />
      }
    >
      <Box sx={{ width: "100%" }}>
        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4 }}>
            No hay tamaños para mostrar.
          </Typography>
        ) : (
          <MaintainerDataGrid
            editingRowId={editingRowId}
            columns={columns}
            rows={currentRows}
            loading={isLoading}
            getRowId={(row: OrganizationSizeFormRow) => row.id}
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
