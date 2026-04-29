import { FC, useCallback, useEffect, useMemo } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Typography } from "@mui/material";
import type { IFuseOptions } from "fuse.js";
import type { GridValidRowModel } from "@mui/x-data-grid";
import {
  CountryOrganizationSizeStatus,
  type AdminCountryOrganizationSize,
  type CreateCountryOrganizationSizeRequest,
  type UpdateCountryOrganizationSizeRequest,
} from "@repo/types";
import {
  useAdminCountryOrganizationSizes,
  useCreateCountryOrganizationSize,
  useUpdateCountryOrganizationSize,
  useSoftDeleteCountryOrganizationSize,
  useRestoreCountryOrganizationSize,
  useSwapCountryOrganizationSizePositions,
} from "@/api/query/countryOrganizationSizes";
import { ProfilingMaintainerScreenLayout } from "../components/ProfilingMaintainerScreenLayout";
import { InUseWarningDialog } from "../components/dialogs/InUseWarningDialog";
import { RestoreBlockedDialog } from "../components/dialogs/RestoreBlockedDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import { useProfilingEditingState } from "../hooks/useProfilingEditingState";
import { useProfilingFormSync } from "../hooks/useProfilingFormSync";
import { useProfilingRowActions } from "../hooks/useProfilingRowActions";
import { useJumpToLastPageOnAdd } from "../hooks/useJumpToLastPageOnAdd";
import {
  useOrganizationSizeProfilingColumns,
  type OrganizationSizeFormRow,
} from "../hooks/useOrganizationSizeProfilingColumns";
import { sortByStatusThenPosition } from "../utils/profilingSort";
import { PROFILING_STATUS_LABELS } from "../constants";
import { useSnackbar } from "notistack";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { VOCAB } from "@/config/vocab";

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
  position: z.number().int().positive(),
  status: z.enum(CountryOrganizationSizeStatus),
  isInUse: z.boolean(),
  impactedChildren: z.object({
    organizationData: z.number().int().nonnegative(),
  }),
});
const FormSchema = z.object({ organizationSizes: z.array(RowSchema) });
type FormValues = z.infer<typeof FormSchema>;

const toFormSize = (
  s: AdminCountryOrganizationSize
): OrganizationSizeFormRow => ({
  id: s.id,
  name: s.name,
  description: s.description,
  position: s.position,
  status: s.status,
  isInUse: s.isInUse,
  impactedChildren: s.impactedChildren,
});

export const OrganizationSizesMaintainerScreen: FC = () => {
  const { data: rows, isLoading } = useAdminCountryOrganizationSizes("all");
  const createMutation = useCreateCountryOrganizationSize();
  const updateMutation = useUpdateCountryOrganizationSize();
  const deleteMutation = useSoftDeleteCountryOrganizationSize();
  const restoreMutation = useRestoreCountryOrganizationSize();
  const swapMutation = useSwapCountryOrganizationSizePositions();
  const { enqueueSnackbar } = useSnackbar();

  const fuseOptions = useMemo<IFuseOptions<OrganizationSizeFormRow>>(
    () => ({
      keys: ["name", "description", "statusLabel"],
      threshold: 0.3,
      ignoreLocation: true,
      getFn: (row, path) => {
        const key = Array.isArray(path) ? path[0] : path;
        if (key === "statusLabel") {
          return row.status === CountryOrganizationSizeStatus.ACTIVE
            ? PROFILING_STATUS_LABELS.ACTIVE
            : PROFILING_STATUS_LABELS.DELETED;
        }
        const value = (row as Record<string, unknown>)[key];
        return typeof value === "string" ? value : "";
      },
    }),
    []
  );

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
  const sortRows = useCallback(
    (data: unknown[]) =>
      sortByStatusThenPosition(data as OrganizationSizeFormRow[]),
    []
  );
  useProfilingFormSync({
    form,
    fieldName: "organizationSizes",
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
      // Server assigns the real position on create; this temp value is replaced after persist.
      position: Number.MAX_SAFE_INTEGER,
      status: CountryOrganizationSizeStatus.ACTIVE,
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

  const handleMove = useCallback(
    async (row: OrganizationSizeFormRow, direction: "up" | "down") => {
      const all = form.getValues("organizationSizes");
      const activeSorted = [...all]
        .filter((r) => r.status === CountryOrganizationSizeStatus.ACTIVE)
        .sort((a, b) => a.position - b.position);
      const idx = activeSorted.findIndex((r) => r.id === row.id);
      if (idx === -1) return;
      if (direction === "up" && idx === 0) return;
      if (direction === "down" && idx === activeSorted.length - 1) return;

      const neighbor = activeSorted[direction === "up" ? idx - 1 : idx + 1];
      if (row.id.startsWith("temp_") || neighbor.id.startsWith("temp_")) return;

      try {
        await swapMutation.mutateAsync({
          sizeIdA: row.id,
          sizeIdB: neighbor.id,
        });
        const updated = all.map((r) => {
          if (r.id === row.id) return { ...r, position: neighbor.position };
          if (r.id === neighbor.id) return { ...r, position: row.position };
          return r;
        });
        form.reset(
          { organizationSizes: sortByStatusThenPosition(updated) },
          { keepDirty: false }
        );
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "No se pudo reordenar el tamaño"),
          { variant: "error" }
        );
      }
    },
    [form, swapMutation, enqueueSnackbar]
  );

  const handleMoveUp = useCallback(
    (row: OrganizationSizeFormRow) => void handleMove(row, "up"),
    [handleMove]
  );
  const handleMoveDown = useCallback(
    (row: OrganizationSizeFormRow) => void handleMove(row, "down"),
    [handleMove]
  );

  const columns = useOrganizationSizeProfilingColumns({
    editingRowId,
    rows: currentRows,
    onCellChange: handleCellChange,
    onStartEditRow: actions.handleStartEditRow,
    onStopEditRow: actions.handleStopEditRow,
    onCancelEditRow: actions.handleCancelEditRow,
    onDelete: actions.handleDelete,
    onRestore: actions.handleRestore,
    onMoveUp: handleMoveUp,
    onMoveDown: handleMoveDown,
    moveDisabled: swapMutation.isPending,
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
      title={`Tamaño de ${VOCAB.organization.article.singular}`}
      subtitle={`Gestiona los tamaños que ${VOCAB.organization.article.plural} pueden seleccionar. El ordén de las filas se respetará al mostrar las opciones en el perfil de ${VOCAB.organization.article.singular}.`}
      addLabel="Agregar tamaño"
      onAddRow={handleAddRow}
      addDisabled={editingRowId !== null}
      form={form}
      blockerStatus={status}
      onBlockerProceed={() => proceed?.()}
      onBlockerReset={() => reset?.()}
      extraDialogs={
        <>
          <InUseWarningDialog
            open={actions.pendingPatch !== null}
            entityLabel="tamaño"
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
            searchable={{
              fuseOptions: fuseOptions as IFuseOptions<GridValidRowModel>,
              placeholder: "Buscar tamaños...",
            }}
            disableColumnFilter={false}
            disableColumnSorting={false}
            disableColumnMenu={false}
            localeText={{
              noRowsLabel: "No hay tamaños para mostrar",
              noResultsOverlayLabel: "No se encontraron tamaños",
            }}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
