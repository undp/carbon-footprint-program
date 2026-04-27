import { FC, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  EditOutlined,
  DeleteOutlineOutlined,
  RestoreOutlined,
} from "@mui/icons-material";
import type { GridColDef } from "@mui/x-data-grid";
import { useSnackbar } from "notistack";
import { z } from "zod";
import {
  OrganizationMainActivityStatus,
  type AdminOrganizationMainActivity,
  type AdminListStatusFilter,
} from "@repo/types";
import { useBlocker } from "@tanstack/react-router";
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
import {
  InUseWarningDialog,
  type ProfilingEntityLabel,
} from "../components/dialogs/InUseWarningDialog";
import { StylizedDataGrid } from "@components";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

const FormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(255, "El nombre no puede superar los 255 caracteres"),
  description: z.string().trim().max(2000).nullable(),
  countrySectorId: z.string().nullable(),
  countrySubsectorId: z.string().nullable(),
});
type FormValues = z.infer<typeof FormSchema>;

const ENTITY_LABEL: ProfilingEntityLabel = "actividad principal";

export const MainActivitiesMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] =
    useState<AdminListStatusFilter>("active");
  const [dialogState, setDialogState] = useState<
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; row: AdminOrganizationMainActivity }
  >({ mode: "closed" });
  type PatchBody = {
    name?: string;
    description?: string | null;
    countrySectorId?: string | null;
    countrySubsectorId?: string | null;
  };
  const [pendingPatch, setPendingPatch] = useState<{
    id: string;
    body: PatchBody;
  } | null>(null);

  const { data: rows, isLoading } =
    useAdminOrganizationMainActivities(statusFilter);
  const { data: activeSectors } = useAdminCountrySectors("active");
  const { data: activeSubsectors } = useAdminCountrySubsectors("active");
  const createMutation = useCreateOrganizationMainActivity();
  const updateMutation = useUpdateOrganizationMainActivity();
  const deleteMutation = useSoftDeleteOrganizationMainActivity();
  const restoreMutation = useRestoreOrganizationMainActivity();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      description: null,
      countrySectorId: null,
      countrySubsectorId: null,
    },
  });

  const blocker = useBlocker({
    shouldBlockFn: () =>
      form.formState.isDirty || dialogState.mode !== "closed",
    withResolver: true,
  });

  const sectorOptions = activeSectors ?? [];
  const watchedSectorId = form.watch("countrySectorId");
  const filteredSubsectorOptions = useMemo(() => {
    if (!activeSubsectors) return [];
    if (!watchedSectorId) return activeSubsectors;
    return activeSubsectors.filter(
      (s) => s.countrySectorId === watchedSectorId
    );
  }, [activeSubsectors, watchedSectorId]);

  const openCreate = () => {
    form.reset({
      name: "",
      description: null,
      countrySectorId: null,
      countrySubsectorId: null,
    });
    setDialogState({ mode: "create" });
  };
  const openEdit = (row: AdminOrganizationMainActivity) => {
    form.reset({
      name: row.name,
      description: row.description,
      countrySectorId: row.countrySectorId,
      countrySubsectorId: row.countrySubsectorId,
    });
    setDialogState({ mode: "edit", row });
  };
  const closeDialog = () => {
    form.reset({
      name: "",
      description: null,
      countrySectorId: null,
      countrySubsectorId: null,
    });
    setDialogState({ mode: "closed" });
  };

  const dispatchPatch = async (id: string, body: PatchBody) => {
    try {
      await updateMutation.mutateAsync({ id, body });
      enqueueSnackbar("Cambios guardados satisfactoriamente", {
        variant: "success",
      });
      closeDialog();
    } catch (error) {
      enqueueSnackbar(
        getApiErrorMessage(error, "No se pudo guardar la actividad principal"),
        { variant: "error" }
      );
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (dialogState.mode === "create") {
      try {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description ?? null,
          countrySectorId: values.countrySectorId ?? null,
          countrySubsectorId: values.countrySubsectorId ?? null,
        });
        enqueueSnackbar("Actividad principal creada exitosamente", {
          variant: "success",
        });
        closeDialog();
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "No se pudo crear la actividad principal"),
          { variant: "error" }
        );
      }
    } else if (dialogState.mode === "edit") {
      const body: PatchBody = {};
      if (values.name !== dialogState.row.name) body.name = values.name;
      if (values.description !== dialogState.row.description)
        body.description = values.description;
      if (values.countrySectorId !== dialogState.row.countrySectorId)
        body.countrySectorId = values.countrySectorId;
      if (values.countrySubsectorId !== dialogState.row.countrySubsectorId)
        body.countrySubsectorId = values.countrySubsectorId;
      if (Object.keys(body).length === 0) {
        closeDialog();
        return;
      }
      const visibleChanged =
        body.name !== undefined ||
        body.countrySectorId !== undefined ||
        body.countrySubsectorId !== undefined;
      if (visibleChanged && dialogState.row.isInUse) {
        setPendingPatch({ id: dialogState.row.id, body });
        return;
      }
      await dispatchPatch(dialogState.row.id, body);
    }
  });

  const handleSoftDelete = async (row: AdminOrganizationMainActivity) => {
    try {
      await deleteMutation.mutateAsync(row.id);
      enqueueSnackbar("Actividad principal eliminada", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        getApiErrorMessage(error, "No se pudo eliminar la actividad principal"),
        { variant: "error" }
      );
    }
  };
  const handleRestore = async (row: AdminOrganizationMainActivity) => {
    try {
      await restoreMutation.mutateAsync(row.id);
      enqueueSnackbar("Actividad principal restaurada", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        getApiErrorMessage(
          error,
          "No se pudo restaurar la actividad principal"
        ),
        { variant: "error" }
      );
    }
  };

  const columns = useMemo<GridColDef<AdminOrganizationMainActivity>[]>(
    () => [
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 220 },
      {
        field: "countrySectorName",
        headerName: "Rubro",
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => row.countrySectorName ?? "—",
      },
      {
        field: "countrySubsectorName",
        headerName: "Subrubro",
        flex: 1,
        minWidth: 160,
        renderCell: ({ row }) => row.countrySubsectorName ?? "—",
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: ({ row }) =>
          row.status === OrganizationMainActivityStatus.ACTIVE ? (
            <Chip label="Activo" size="small" color="success" />
          ) : (
            <Chip label="Eliminado" size="small" color="default" />
          ),
      },
      {
        field: "actions",
        headerName: "Acciones",
        width: 140,
        sortable: false,
        renderCell: ({ row }) =>
          row.status === OrganizationMainActivityStatus.ACTIVE ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <EditOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Eliminar">
                <IconButton
                  size="small"
                  onClick={() => handleSoftDelete(row)}
                  disabled={deleteMutation.isPending}
                >
                  <DeleteOutlineOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Tooltip title="Restaurar">
              <IconButton
                size="small"
                onClick={() => handleRestore(row)}
                disabled={restoreMutation.isPending}
              >
                <RestoreOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteMutation.isPending, restoreMutation.isPending]
  );

  return (
    <ProfilingMaintainerScreenLayout
      title="Actividades Principales"
      addLabel="Agregar actividad"
      onAddRow={openCreate}
      statusFilter={
        <MaintainerStatusFilterToggle
          value={statusFilter}
          onChange={setStatusFilter}
        />
      }
      form={form}
      blockerStatus={blocker.status}
      onBlockerProceed={blocker.proceed}
      onBlockerReset={blocker.reset}
      extraDialogs={
        <>
          <Dialog open={dialogState.mode !== "closed"} onClose={closeDialog}>
            <DialogTitle>
              {dialogState.mode === "create"
                ? "Nueva actividad principal"
                : "Editar actividad principal"}
            </DialogTitle>
            <form onSubmit={handleSubmit} noValidate>
              <DialogContent>
                <Stack spacing={2} sx={{ minWidth: 420 }}>
                  <TextField
                    label="Nombre"
                    fullWidth
                    autoFocus
                    {...form.register("name")}
                    error={!!form.formState.errors.name}
                    helperText={form.formState.errors.name?.message}
                  />
                  <TextField
                    select
                    label="Rubro (opcional)"
                    fullWidth
                    value={form.watch("countrySectorId") ?? ""}
                    onChange={(e) => {
                      const value = e.target.value || null;
                      form.setValue("countrySectorId", value, {
                        shouldDirty: true,
                      });
                      // Clear subsector if it no longer matches the chosen sector.
                      const currentSubsectorId =
                        form.getValues("countrySubsectorId");
                      if (currentSubsectorId && activeSubsectors) {
                        const sub = activeSubsectors.find(
                          (s) => s.id === currentSubsectorId
                        );
                        if (sub && sub.countrySectorId !== value) {
                          form.setValue("countrySubsectorId", null, {
                            shouldDirty: true,
                          });
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Sin rubro</em>
                    </MenuItem>
                    {sectorOptions.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Subrubro (opcional)"
                    fullWidth
                    value={form.watch("countrySubsectorId") ?? ""}
                    onChange={(e) =>
                      form.setValue(
                        "countrySubsectorId",
                        e.target.value || null,
                        { shouldDirty: true }
                      )
                    }
                  >
                    <MenuItem value="">
                      <em>Sin subrubro</em>
                    </MenuItem>
                    {filteredSubsectorOptions.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Descripción (opcional)"
                    fullWidth
                    multiline
                    minRows={2}
                    {...form.register("description", {
                      setValueAs: (v: unknown) =>
                        typeof v === "string" && v.trim() === "" ? null : v,
                    })}
                  />
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={closeDialog}>Cancelar</Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {dialogState.mode === "create" ? "Crear" : "Guardar"}
                </Button>
              </DialogActions>
            </form>
          </Dialog>
          <InUseWarningDialog
            open={pendingPatch !== null}
            entityLabel={ENTITY_LABEL}
            onCancel={() => setPendingPatch(null)}
            onConfirm={async () => {
              if (!pendingPatch) return;
              const { id, body } = pendingPatch;
              setPendingPatch(null);
              await dispatchPatch(id, body);
            }}
          />
        </>
      }
    >
      <Box sx={{ width: "100%" }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : !rows || rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4 }}>
            No hay actividades principales para mostrar.
          </Typography>
        ) : (
          <StylizedDataGrid
            rows={rows}
            columns={columns}
            getRowId={(row: { id: string }) => row.id}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
