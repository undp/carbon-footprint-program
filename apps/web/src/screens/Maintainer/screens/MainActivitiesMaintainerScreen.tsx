import { FC, useCallback, useEffect, useMemo } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import type { IFuseOptions } from "fuse.js";
import {
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  type AdminOrganizationMainActivity,
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
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { RestoreBlockedDialog } from "../components/dialogs/RestoreBlockedDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToFirstPageOnAdd } from "../hooks/useJumpToFirstPageOnAdd";
import {
  useMainActivityProfilingColumns,
  MainActivityRowSchema,
  type MainActivityFormRow,
} from "../hooks/useMainActivityProfilingColumns";
import { sortByStatusThenName } from "../utils/profilingSort";
import { PROFILING_STATUS_CONFIG } from "@/labels/status/profiling";
import { VOCAB } from "@/config/vocab";

const MAIN_ACTIVITIES_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "main-activities-maintainer",
} as const;

const FormSchema = z.object({
  mainActivities: z.array(MainActivityRowSchema),
});
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
  impactedChildren: s.impactedChildren,
});

export const MainActivitiesMaintainerScreen: FC = () => {
  const { data: rows, isLoading } = useAdminOrganizationMainActivities("all");
  const { data: allSectors } = useAdminCountrySectors("all");
  const { data: allSubsectors } = useAdminCountrySubsectors("all");
  const createMutation = useCreateOrganizationMainActivity();
  const updateMutation = useUpdateOrganizationMainActivity();
  const deleteMutation = useSoftDeleteOrganizationMainActivity();
  const restoreMutation = useRestoreOrganizationMainActivity();

  const sectorOptions = useMemo(
    () =>
      (allSectors ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        disabled: s.status !== CountrySectorStatus.ACTIVE,
      })),
    [allSectors]
  );
  const subsectorOptions = useMemo(
    () =>
      (allSubsectors ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        countrySectorId: s.countrySectorId,
        disabled: s.status !== CountrySubsectorStatus.ACTIVE,
      })),
    [allSubsectors]
  );

  const fuseOptions = useMemo<IFuseOptions<MainActivityFormRow>>(
    () => ({
      keys: [
        "name",
        "description",
        "sectorName",
        "subsectorName",
        "statusLabel",
      ],
      threshold: 0.3,
      ignoreLocation: true,
      getFn: (row, path) => {
        const key = Array.isArray(path) ? path[0] : path;
        if (key === "sectorName") {
          return row.countrySectorId
            ? (sectorOptions.find((o) => o.id === row.countrySectorId)?.name ??
                "")
            : "";
        }
        if (key === "subsectorName") {
          return row.countrySubsectorId
            ? (subsectorOptions.find((o) => o.id === row.countrySubsectorId)
                ?.name ?? "")
            : "";
        }
        if (key === "statusLabel") {
          return row.status === OrganizationMainActivityStatus.ACTIVE
            ? PROFILING_STATUS_CONFIG.ACTIVE.label
            : PROFILING_STATUS_CONFIG.DELETED.label;
        }
        const value = (row as Record<string, unknown>)[key];
        return typeof value === "string" ? value : "";
      },
    }),
    [sectorOptions, subsectorOptions]
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
  const sortRows = useCallback(
    (data: unknown[]) => sortByStatusThenName(data as MainActivityFormRow[]),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "mainActivities",
    editingRowId,
    serverData: rows,
    toFormData,
    sortRows,
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
      void form.trigger(`mainActivities.${rowIndex}.${field}`);
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
      if (!subsectorId) return;
      const currentSectorId = form.getValues(
        `mainActivities.${rowIndex}.countrySectorId`
      );
      if (currentSectorId) return;
      const parentSectorId = subsectorOptions.find(
        (s) => s.id === subsectorId
      )?.countrySectorId;
      if (!parentSectorId) return;
      form.setValue(
        `mainActivities.${rowIndex}.countrySectorId`,
        parentSectorId,
        { shouldDirty: true }
      );
    },
    [form, subsectorOptions]
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
      status: null,
      isInUse: false,
      impactedChildren: { organizationData: 0 },
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

  const { paginationModel, setPaginationModel, jumpToFirstPage } =
    useJumpToFirstPageOnAdd();

  const handleAddRow = useCallback(() => {
    actions.handleAddRow();
    jumpToFirstPage();
  }, [actions, jumpToFirstPage]);

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

  // Read from `currentRows` (not the server-backed `rows`) so the empty state
  // disappears as soon as the admin adds the first temp row, rather than
  // waiting for the POST to succeed.
  const isEmpty = !isLoading && currentRows.length === 0;

  return (
    <ProfilingMaintainerScreenLayout
      title="Actividades Principales"
      subtitle={`Gestiona las actividades principales que ${VOCAB.organization.article.plural} pueden seleccionar.`}
      addLabel="Agregar actividad"
      onAddRow={handleAddRow}
      addDisabled={editingRowId !== null}
      form={form}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      explanationSlug={MAIN_ACTIVITIES_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      extraDialogs={
        <>
          <InUseWarningDialog
            open={actions.pendingPatch !== null}
            entityLabel="actividad principal"
            onCancel={actions.cancelPendingPatch}
            onConfirm={actions.dispatchPendingPatch}
          />
          <RestoreBlockedDialog
            open={actions.restoreBlockedMessage !== null}
            message={actions.restoreBlockedMessage ?? ""}
            onClose={actions.dismissRestoreBlocked}
          />
        </>
      }
    >
      <Box sx={{ width: "100%" }}>
        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4 }}>
            No hay actividades principales para mostrar.
          </Typography>
        ) : (
          <MaintainerDataGrid<MainActivityFormRow>
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
            searchable={{
              fuseOptions,
              placeholder: "Buscar actividades...",
              downloadFileName: "actividades-principales",
            }}
            disableColumnFilter={false}
            disableColumnSorting={false}
            disableColumnMenu={false}
            localeText={{
              noRowsLabel: "No hay actividades principales para mostrar",
              noResultsOverlayLabel:
                "No se encontraron actividades principales",
            }}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
