import { FC, useCallback, useEffect, useMemo } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import type { IFuseOptions } from "fuse.js";
import type { GridValidRowModel } from "@mui/x-data-grid";
import {
  CountrySectorStatus,
  CountrySubsectorStatus,
  type AdminCountrySubsector,
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
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { RestoreBlockedDialog } from "../components/dialogs/RestoreBlockedDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToLastPageOnAdd } from "../hooks/useJumpToLastPageOnAdd";
import {
  useSubsectorProfilingColumns,
  SubsectorRowSchema,
  type SubsectorFormRow,
} from "../hooks/useSubsectorProfilingColumns";
import { sortByStatusThenName } from "../utils/profilingSort";
import { PROFILING_STATUS_LABELS } from "../constants";
import { VOCAB } from "@/config/vocab";

const FormSchema = z.object({
  subsectors: z.array(SubsectorRowSchema),
});
type FormValues = z.infer<typeof FormSchema>;

const toFormSubsector = (s: AdminCountrySubsector): SubsectorFormRow => ({
  id: s.id,
  name: s.name,
  description: s.description,
  countrySectorId: s.countrySectorId,
  status: s.status,
  isInUse: s.isInUse,
  impactedChildren: s.impactedChildren,
});

export const SubsectorsMaintainerScreen: FC = () => {
  const { data: rows, isLoading } = useAdminCountrySubsectors("all");
  const { data: allSectors } = useAdminCountrySectors("all");
  const createMutation = useCreateCountrySubsector();
  const updateMutation = useUpdateCountrySubsector();
  const deleteMutation = useSoftDeleteCountrySubsector();
  const restoreMutation = useRestoreCountrySubsector();

  const sectorOptions = useMemo(
    () =>
      (allSectors ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        disabled: s.status !== CountrySectorStatus.ACTIVE,
      })),
    [allSectors]
  );
  const hasActiveSector = sectorOptions.some((o) => !o.disabled);
  const noSectors = !hasActiveSector;

  const fuseOptions = useMemo<IFuseOptions<SubsectorFormRow>>(
    () => ({
      keys: ["name", "description", "sectorName", "statusLabel"],
      threshold: 0.3,
      ignoreLocation: true,
      getFn: (row, path) => {
        const key = Array.isArray(path) ? path[0] : path;
        if (key === "sectorName") {
          return (
            sectorOptions.find((o) => o.id === row.countrySectorId)?.name ?? ""
          );
        }
        if (key === "statusLabel") {
          return row.status === CountrySubsectorStatus.ACTIVE
            ? PROFILING_STATUS_LABELS.ACTIVE
            : PROFILING_STATUS_LABELS.DELETED;
        }
        const value = (row as Record<string, unknown>)[key];
        return typeof value === "string" ? value : "";
      },
    }),
    [sectorOptions]
  );

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
  const sortRows = useCallback(
    (data: unknown[]) => sortByStatusThenName(data as SubsectorFormRow[]),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "subsectors",
    editingRowId,
    serverData: rows,
    toFormData,
    sortRows,
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
      countrySectorId: sectorOptions.find((o) => !o.disabled)?.id ?? "",
      impactedChildren: {
        activeMainActivities: 0,
        organizationData: 0,
        subcategoryRecommendations: 0,
      },
      status: null,
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

  // Read from `currentRows` (not the server-backed `rows`) so the empty state
  // disappears as soon as the admin adds the first temp row, rather than
  // waiting for the POST to succeed.
  const isEmpty = !isLoading && currentRows.length === 0;

  return (
    <ProfilingMaintainerScreenLayout
      title="Subrubros"
      subtitle={`Gestiona los subrubros que ${VOCAB.organization.article.plural} pueden seleccionar.`}
      addLabel="Agregar subrubro"
      onAddRow={handleAddRow}
      addDisabled={noSectors || editingRowId !== null}
      form={form}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      extraDialogs={
        <>
          <InUseWarningDialog
            open={actions.pendingPatch !== null}
            entityLabel="subrubro"
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
            searchable={{
              fuseOptions: fuseOptions as IFuseOptions<GridValidRowModel>,
              placeholder: "Buscar subrubros...",
            }}
            disableColumnFilter={false}
            disableColumnSorting={false}
            disableColumnMenu={false}
            localeText={{
              noRowsLabel: "No hay subrubros para mostrar",
              noResultsOverlayLabel: "No se encontraron subrubros",
            }}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
