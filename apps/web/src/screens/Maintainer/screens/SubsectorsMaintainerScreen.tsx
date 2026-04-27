import { FC, useCallback, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
  CountrySubsectorStatus,
  type AdminCountrySubsector,
  type AdminListStatusFilter,
} from "@repo/types";
import { useBlocker } from "@tanstack/react-router";
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
  countrySectorId: z.string().min(1, "El rubro es obligatorio"),
});
type FormValues = z.infer<typeof FormSchema>;

const ENTITY_LABEL: ProfilingEntityLabel = "subrubro";

export const SubsectorsMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] =
    useState<AdminListStatusFilter>("active");
  const [dialogState, setDialogState] = useState<
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; row: AdminCountrySubsector }
  >({ mode: "closed" });
  const [pendingPatch, setPendingPatch] = useState<{
    id: string;
    body: {
      name?: string;
      description?: string | null;
      countrySectorId?: string;
    };
  } | null>(null);

  const { data: rows, isLoading } = useAdminCountrySubsectors(statusFilter);
  const { data: activeSectors } = useAdminCountrySectors("active");
  const createMutation = useCreateCountrySubsector();
  const updateMutation = useUpdateCountrySubsector();
  const deleteMutation = useSoftDeleteCountrySubsector();
  const restoreMutation = useRestoreCountrySubsector();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { name: "", description: null, countrySectorId: "" },
  });

  const blocker = useBlocker({
    shouldBlockFn: () =>
      form.formState.isDirty || dialogState.mode !== "closed",
    withResolver: true,
  });

  const sectorOptions = useMemo(() => activeSectors ?? [], [activeSectors]);
  const noSectors = sectorOptions.length === 0;
  const watchedSectorId = useWatch({
    control: form.control,
    name: "countrySectorId",
  });

  const openCreate = () => {
    form.reset({ name: "", description: null, countrySectorId: "" });
    setDialogState({ mode: "create" });
  };
  const openEdit = useCallback(
    (row: AdminCountrySubsector) => {
      form.reset({
        name: row.name,
        description: row.description,
        countrySectorId: row.countrySectorId,
      });
      setDialogState({ mode: "edit", row });
    },
    [form]
  );
  const closeDialog = () => {
    form.reset({ name: "", description: null, countrySectorId: "" });
    setDialogState({ mode: "closed" });
  };

  const dispatchPatch = async (
    id: string,
    body: {
      name?: string;
      description?: string | null;
      countrySectorId?: string;
    }
  ) => {
    try {
      await updateMutation.mutateAsync({ id, body });
      enqueueSnackbar("Cambios guardados satisfactoriamente", {
        variant: "success",
      });
      closeDialog();
    } catch (error) {
      enqueueSnackbar(
        getApiErrorMessage(error, "No se pudo guardar el subrubro"),
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
          countrySectorId: values.countrySectorId,
        });
        enqueueSnackbar("Subrubro creado exitosamente", { variant: "success" });
        closeDialog();
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "No se pudo crear el subrubro"),
          { variant: "error" }
        );
      }
    } else if (dialogState.mode === "edit") {
      const body: {
        name?: string;
        description?: string | null;
        countrySectorId?: string;
      } = {};
      if (values.name !== dialogState.row.name) body.name = values.name;
      if (values.description !== dialogState.row.description)
        body.description = values.description;
      if (values.countrySectorId !== dialogState.row.countrySectorId)
        body.countrySectorId = values.countrySectorId;
      if (Object.keys(body).length === 0) {
        closeDialog();
        return;
      }
      const visibleChanged =
        body.name !== undefined || body.countrySectorId !== undefined;
      if (visibleChanged && dialogState.row.isInUse) {
        setPendingPatch({ id: dialogState.row.id, body });
        return;
      }
      await dispatchPatch(dialogState.row.id, body);
    }
  });

  const handleSoftDelete = useCallback(
    async (row: AdminCountrySubsector) => {
      try {
        await deleteMutation.mutateAsync(row.id);
        enqueueSnackbar("Subrubro eliminado", { variant: "success" });
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "No se pudo eliminar el subrubro"),
          { variant: "error" }
        );
      }
    },
    [deleteMutation, enqueueSnackbar]
  );
  const handleRestore = useCallback(
    async (row: AdminCountrySubsector) => {
      try {
        await restoreMutation.mutateAsync(row.id);
        enqueueSnackbar("Subrubro restaurado", { variant: "success" });
      } catch (error) {
        enqueueSnackbar(
          getApiErrorMessage(error, "No se pudo restaurar el subrubro"),
          { variant: "error" }
        );
      }
    },
    [restoreMutation, enqueueSnackbar]
  );

  const sectorNameById = useMemo(() => {
    const map = new Map<string, string>();
    sectorOptions.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sectorOptions]);

  const columns = useMemo<GridColDef<AdminCountrySubsector>[]>(
    () => [
      { field: "name", headerName: "Nombre", flex: 1, minWidth: 200 },
      {
        field: "countrySectorId",
        headerName: "Rubro",
        flex: 1,
        minWidth: 180,
        renderCell: ({ row }) =>
          sectorNameById.get(row.countrySectorId) ?? row.countrySectorId,
      },
      {
        field: "description",
        headerName: "Descripción",
        flex: 2,
        minWidth: 220,
        renderCell: ({ row }) => row.description ?? "—",
      },
      {
        field: "status",
        headerName: "Estado",
        width: 130,
        renderCell: ({ row }) =>
          row.status === CountrySubsectorStatus.ACTIVE ? (
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
          row.status === CountrySubsectorStatus.ACTIVE ? (
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
    [
      deleteMutation.isPending,
      restoreMutation.isPending,
      sectorNameById,
      openEdit,
      handleSoftDelete,
      handleRestore,
    ]
  );

  return (
    <ProfilingMaintainerScreenLayout
      title="Subrubros"
      addLabel="Agregar subrubro"
      onAddRow={openCreate}
      addDisabled={noSectors}
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
                ? "Nuevo subrubro"
                : "Editar subrubro"}
            </DialogTitle>
            <form onSubmit={handleSubmit} noValidate>
              <DialogContent>
                <Stack spacing={2} sx={{ minWidth: 400 }}>
                  <TextField
                    select
                    label="Rubro"
                    fullWidth
                    value={watchedSectorId}
                    onChange={(e) =>
                      form.setValue("countrySectorId", e.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    error={!!form.formState.errors.countrySectorId}
                    helperText={form.formState.errors.countrySectorId?.message}
                  >
                    {sectorOptions.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Nombre"
                    fullWidth
                    {...form.register("name")}
                    error={!!form.formState.errors.name}
                    helperText={form.formState.errors.name?.message}
                  />
                  <TextField
                    label="Descripción (opcional)"
                    fullWidth
                    multiline
                    minRows={2}
                    error={!!form.formState.errors.description}
                    helperText={form.formState.errors.description?.message}
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
        {noSectors && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Crea primero un rubro antes de agregar subrubros.
          </Typography>
        )}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : !rows || rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 4 }}>
            No hay subrubros para mostrar.
          </Typography>
        ) : (
          <StylizedDataGrid
            rows={rows}
            columns={columns}
            getRowId={(row: { id: string }) => row.id}
            pagination
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
          />
        )}
      </Box>
    </ProfilingMaintainerScreenLayout>
  );
};
