import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import {
  OrganizationMainActivityStatus,
  type AdminOrganizationMainActivity,
  type AdminListStatusFilter,
  type CreateOrganizationMainActivityRequest,
  type UpdateOrganizationMainActivityRequest,
} from "@repo/types";
import {
  useAdminOrganizationMainActivities,
  useCreateOrganizationMainActivity,
  useUpdateOrganizationMainActivity,
  useSoftDeleteOrganizationMainActivity,
  useRestoreOrganizationMainActivity,
} from "@/api/query/organizationMainActivities";
import { useAdminCountrySectors } from "@/api/query/countrySectors";
import { useAdminCountrySubsectors } from "@/api/query/countrySubsectors";
import { ProfilingMaintainerScreenLayout } from "../components/ProfilingMaintainerScreenLayout";
import { MaintainerStatusFilterToggle } from "../components/MaintainerStatusFilterToggle";
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToLastPageOnAdd } from "../hooks/useJumpToLastPageOnAdd";
import {
  useMainActivityProfilingColumns,
  type MainActivityFormRow,
} from "../hooks/useMainActivityProfilingColumns";

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
  countrySectorId: z.string().nullable(),
  countrySubsectorId: z.string().nullable(),
  status: z.enum(OrganizationMainActivityStatus),
  isInUse: z.boolean(),
});
const FormSchema = z.object({ mainActivities: z.array(RowSchema) });
type FormValues = z.infer<typeof FormSchema>;

const toFormMainActivity = (
  s: AdminOrganizationMainActivity
): MainActivityFormRow => ({
  id: s.id,
  name: s.name,
  description: s.description,
  countrySectorId: s.countrySectorId,
  countrySubsectorId: s.countrySubsectorId,
  status: s.status,
  isInUse: s.isInUse,
});

export const MainActivitiesMaintainerScreen: FC = () => {
  const [statusFilter, setStatusFilter] =
    useState<AdminListStatusFilter>("active");

  const { data: rows, isLoading } =
    useAdminOrganizationMainActivities(statusFilter);
  const { data: activeSectors } = useAdminCountrySectors("active");
  const { data: activeSubsectors } = useAdminCountrySubsectors("active");
  const createMutation = useCreateOrganizationMainActivity();
  const updateMutation = useUpdateOrganizationMainActivity();
  const deleteMutation = useSoftDeleteOrganizationMainActivity();
  const restoreMutation = useRestoreOrganizationMainActivity();

  const sectorOptions = useMemo(
    () => (activeSectors ?? []).map((s) => ({ id: s.id, name: s.name })),
    [activeSectors]
  );
  const subsectorOptions = useMemo(
    () =>
      (activeSubsectors ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        countrySectorId: s.countrySectorId,
      })),
    [activeSubsectors]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { mainActivities: [] },
    mode: "onBlur",
  });
  const fieldArray = useFieldArray({
    control: form.control,
    name: "mainActivities",
  });
  const { editingRowId, setEditingRowId, isNewRow } =
    useProfilingEditingState();

  const toFormData = useCallback(
    (data: unknown[]) =>
      (data as AdminOrganizationMainActivity[]).map(toFormMainActivity),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "mainActivities",
    editingRowId,
    serverData: rows,
    toFormData,
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: "name" | "description", value: string) => {
      const next =
        field === "description" && value.trim() === "" ? null : value;
      form.setValue(
        `mainActivities.${rowIndex}.${field}` as `mainActivities.${number}.name`,
        next as never,
        { shouldDirty: true }
      );
      void form.trigger(
        `mainActivities.${rowIndex}.${field}` as `mainActivities.${number}.name`
      );
    },
    [form]
  );

  const handleSectorChange = useCallback(
    (rowIndex: number, sectorId: string | null) => {
      form.setValue(`mainActivities.${rowIndex}.countrySectorId`, sectorId, {
        shouldDirty: true,
      });
      // Clear subsector if it no longer matches the chosen sector.
      const currentSubsectorId = form.getValues(
        `mainActivities.${rowIndex}.countrySubsectorId`
      );
      if (currentSubsectorId) {
        const sub = subsectorOptions.find((s) => s.id === currentSubsectorId);
        if (sub && sub.countrySectorId !== sectorId) {
          form.setValue(`mainActivities.${rowIndex}.countrySubsectorId`, null, {
            shouldDirty: true,
          });
        }
      }
    },
    [form, subsectorOptions]
  );

  const handleSubsectorChange = useCallback(
    (rowIndex: number, subsectorId: string | null) => {
      form.setValue(
        `mainActivities.${rowIndex}.countrySubsectorId`,
        subsectorId,
        { shouldDirty: true }
      );
    },
    [form]
  );

  const actions = useProfilingRowActions<
    FormValues,
    AdminOrganizationMainActivity,
    MainActivityFormRow,
    CreateOrganizationMainActivityRequest,
    UpdateOrganizationMainActivityRequest
  >({
    form,
    fieldArray,
    fieldName: "mainActivities",
    serverRows: rows,
    toFormRow: toFormMainActivity,
    toCreateBody: (row) => ({
      name: row.name,
      description: row.description ?? null,
      countrySectorId: row.countrySectorId ?? null,
      countrySubsectorId: row.countrySubsectorId ?? null,
    }),
    diffUpdateBody: (formRow, serverRow) => {
      const body: UpdateOrganizationMainActivityRequest = {};
      if (formRow.name !== serverRow.name) body.name = formRow.name;
      if (formRow.description !== serverRow.description)
        body.description = formRow.description;
      if (formRow.countrySectorId !== serverRow.countrySectorId)
        body.countrySectorId = formRow.countrySectorId;
      if (formRow.countrySubsectorId !== serverRow.countrySubsectorId)
        body.countrySubsectorId = formRow.countrySubsectorId;
      return Object.keys(body).length === 0 ? null : body;
    },
    visibleFieldsChanged: (body) =>
      body.name !== undefined ||
      body.countrySectorId !== undefined ||
      body.countrySubsectorId !== undefined,
    newRowDefaults: () => ({
      id: `temp_${Date.now()}`,
      name: "",
      description: null,
      countrySectorId: null,
      countrySubsectorId: null,
      status: OrganizationMainActivityStatus.ACTIVE,
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
      create: "Actividad principal creada exitosamente",
      update: "Cambios guardados satisfactoriamente",
      delete: "Actividad principal eliminada",
      restore: "Actividad principal restaurada",
    },
    errorMessages: {
      create: "No se pudo crear la actividad principal",
      update: "No se pudo guardar la actividad principal",
      delete: "No se pudo eliminar la actividad principal",
      restore: "No se pudo restaurar la actividad principal",
    },
  });

  const currentRows = useWatch({
    control: form.control,
    name: "mainActivities",
  });

  const columns = useMainActivityProfilingColumns({
    editingRowId,
    rows: currentRows,
    sectorOptions,
    subsectorOptions,
    onCellChange: handleCellChange,
    onSectorChange: handleSectorChange,
    onSubsectorChange: handleSubsectorChange,
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
      title="Actividades Principales"
      addLabel="Agregar actividad"
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
          entityLabel="actividad principal"
          onCancel={actions.cancelPendingPatch}
          onConfirm={actions.dispatchPendingPatch}
        />
      }
    >
      <Box sx={{ width: "100%" }}>
        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4 }}>
            No hay actividades principales para mostrar.
          </Typography>
        ) : (
          <MaintainerDataGrid
            editingRowId={editingRowId}
            columns={columns}
            rows={currentRows}
            loading={isLoading}
            getRowId={(row: MainActivityFormRow) => row.id}
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
