import { FC, useCallback, useEffect, useMemo } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import type { IFuseOptions } from "fuse.js";
import {
  CountrySectorStatus,
  type AdminCountrySector,
  type CreateCountrySectorRequest,
  type UpdateCountrySectorRequest,
} from "@repo/types";
import {
  useAdminCountrySectors,
  useCreateCountrySector,
  useUpdateCountrySector,
  useSoftDeleteCountrySector,
  useRestoreCountrySector,
} from "@/api/query/countrySectors";
import { ProfilingMaintainerScreenLayout } from "../components/ProfilingMaintainerScreenLayout";
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { RestoreBlockedDialog } from "../components/dialogs/RestoreBlockedDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToFirstPageOnAdd } from "../hooks/useJumpToFirstPageOnAdd";
import {
  useSectorProfilingColumns,
  SectorRowSchema,
  type SectorFormRow,
} from "../hooks/useSectorProfilingColumns";
import { sortByStatusThenName } from "../utils/profilingSort";
import { PROFILING_STATUS_CONFIG_MASCULINE } from "@/labels/status/profiling";
import { VOCAB } from "@/config/vocab";

const SECTORS_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "sectors-maintainer",
} as const;

const FormSchema = z.object({ sectors: z.array(SectorRowSchema) });
type FormValues = z.infer<typeof FormSchema>;

const toFormSector = (s: AdminCountrySector): SectorFormRow => ({
  id: s.id,
  name: s.name,
  description: s.description,
  status: s.status,
  isInUse: s.isInUse,
  impactedChildren: s.impactedChildren,
});

export const SectorsMaintainerScreen: FC = () => {
  const { data: rows, isLoading } = useAdminCountrySectors("all");
  const createMutation = useCreateCountrySector();
  const updateMutation = useUpdateCountrySector();
  const deleteMutation = useSoftDeleteCountrySector();
  const restoreMutation = useRestoreCountrySector();

  const fuseOptions = useMemo<IFuseOptions<SectorFormRow>>(
    () => ({
      keys: ["name", "description", "statusLabel"],
      threshold: 0.3,
      ignoreLocation: true,
      getFn: (row, path) => {
        const key = Array.isArray(path) ? path[0] : path;
        if (key === "statusLabel") {
          return row.status === CountrySectorStatus.ACTIVE
            ? PROFILING_STATUS_CONFIG_MASCULINE.ACTIVE.label
            : PROFILING_STATUS_CONFIG_MASCULINE.DELETED.label;
        }
        const value = (row as Record<string, unknown>)[key];
        return typeof value === "string" ? value : "";
      },
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { sectors: [] },
    mode: "onBlur",
  });
  const fieldArray = useFieldArray({ control: form.control, name: "sectors" });
  const { editingRowId, setEditingRowId, isNewRow } =
    useProfilingEditingState();

  const toFormData = useCallback(
    (data: unknown[]) => (data as AdminCountrySector[]).map(toFormSector),
    []
  );
  const sortRows = useCallback(
    (data: unknown[]) => sortByStatusThenName(data as SectorFormRow[]),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "sectors",
    editingRowId,
    serverData: rows,
    toFormData,
    sortRows,
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: "name" | "description", value: string) => {
      form.setValue(
        `sectors.${rowIndex}.${field}` as `sectors.${number}.name`,
        (field === "description" && value.trim() === ""
          ? null
          : value) as never,
        { shouldDirty: true }
      );
      void form.trigger(`sectors.${rowIndex}.${field}`);
    },
    [form]
  );

  const actions = useProfilingRowActions<
    FormValues,
    AdminCountrySector,
    SectorFormRow,
    CreateCountrySectorRequest,
    UpdateCountrySectorRequest
  >({
    form,
    fieldArray,
    fieldName: "sectors",
    serverRows: rows,
    toFormRow: toFormSector,
    toCreateBody: (row) => ({
      name: row.name,
      description: row.description ?? null,
    }),
    diffUpdateBody: (formRow, serverRow) => {
      const body: UpdateCountrySectorRequest = {};
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
      status: null,
      isInUse: false,
      impactedChildren: {
        activeSubsectors: 0,
        activeMainActivities: 0,
        organizationData: 0,
        subcategoryRecommendations: 0,
      },
    }),
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
    editingRowId,
    setEditingRowId,
    isNewRow,
    successMessages: {
      create: "Rubro creado exitosamente",
      update: "Cambios guardados satisfactoriamente",
      delete: "Rubro eliminado",
      restore: "Rubro restaurado",
    },
    errorMessages: {
      create: "No se pudo crear el rubro",
      update: "No se pudo guardar el rubro",
      delete: "No se pudo eliminar el rubro",
      restore: "No se pudo restaurar el rubro",
    },
  });

  const currentRows = useWatch({ control: form.control, name: "sectors" });

  const columns = useSectorProfilingColumns({
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

  const { paginationModel, setPaginationModel, jumpToFirstPage } =
    useJumpToFirstPageOnAdd();

  const handleAddRow = useCallback(() => {
    actions.handleAddRow();
    jumpToFirstPage();
  }, [actions, jumpToFirstPage]);

  // Scroll to top when a new row is added — the new row is pinned to the top
  // of the grid regardless of any active sort/filter.
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
  const isEmpty = useMemo(
    () => !isLoading && currentRows.length === 0,
    [isLoading, currentRows.length]
  );

  return (
    <ProfilingMaintainerScreenLayout
      title="Rubros"
      subtitle={`Gestiona los rubros que ${VOCAB.organization.article.plural} pueden seleccionar.`}
      addLabel="Agregar rubro"
      onAddRow={handleAddRow}
      addDisabled={editingRowId !== null}
      form={form}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      explanationSlug={SECTORS_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      extraDialogs={
        <>
          <InUseWarningDialog
            open={actions.pendingPatch !== null}
            entityLabel="rubro"
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
            No hay rubros para mostrar.
          </Typography>
        ) : (
          <MaintainerDataGrid<SectorFormRow>
            editingRowId={editingRowId}
            columns={columns}
            rows={currentRows}
            loading={isLoading}
            getRowId={(row: SectorFormRow) => row.id}
            hideFooter={false}
            pagination
            pageSizeOptions={[10, 25, 50, 100]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            showToolbar
            searchable={{
              fuseOptions,
              placeholder: "Buscar rubros...",
              downloadFileName: "rubros",
            }}
            disableColumnFilter={false}
            disableColumnSorting={false}
            disableColumnMenu={false}
            localeText={{
              noRowsLabel: "No hay rubros para mostrar",
              noResultsOverlayLabel: "No se encontraron rubros",
            }}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
