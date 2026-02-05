import { FC, useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import {
  useMethodologies,
  useUpdateMethodology,
  useAddMethodology,
  useDeleteMethodology,
  useDuplicateMethodology,
} from "@/api/query/maintainer";
import { Routes } from "@/interfaces/routes";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import {
  FormMethodology,
  useMethodologiesForm,
} from "../hooks/useMethodologiesForm";
import { useMethodologyColumns } from "../hooks/useMethodologyColumns";
import type { Methodology } from "@repo/types";
import { StylizedDataGrid } from "../../../components";

export const MethodologiesMaintainerScreen: FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // --- Data fetching ---
  const { data: methodologies = [], isLoading } = useMethodologies();
  const addMutation = useAddMethodology();
  const updateMutation = useUpdateMethodology();
  const deleteMutation = useDeleteMethodology();
  const duplicateMutation = useDuplicateMethodology();

  // --- Form setup ---
  const { form, fieldArray, handleCellChange } =
    useMethodologiesForm(methodologies);
  const startEditing = useMaintainerStore((s) => s.startEditing);
  const currentRows = form.watch("methodologies");

  const handleStopEditRow = useCallback(async () => {
    if (!editingRowId) return;

    const rows = form.getValues("methodologies");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    // Validate the row before allowing exit
    const isValid = await form.trigger(`methodologies.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
        autoHideDuration: 2000,
      });
      return;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.methodologies?.[rowIndex];

    if (row && isRowDirty) {
      updateMutation.mutate(
        {
          id: row.id,
          data: {
            name: row.name,
            description: row.description,
            regulation: row.regulation,
            version: row.version,
          },
        },
        {
          onSuccess: () => {
            void enqueueSnackbar({
              message: "Cambios guardados satisfactoriamente",
              variant: "success",
              autoHideDuration: 2000,
            });
          },
        }
      );
    }

    setEditingRowId(null);
  }, [editingRowId, form, updateMutation, enqueueSnackbar]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) await handleStopEditRow();
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow]
  );

  // TODO: The active toggle is disabled until the API supports updating active status
  const handleToggle = useCallback(
    (_row: FormMethodology, _checked: boolean) => {
      void enqueueSnackbar({
        message:
          "La funcionalidad de activar/desactivar no está disponible aún",
        variant: "info",
        autoHideDuration: 2000,
      });
    },
    [enqueueSnackbar]
  );

  const handleEdit = useCallback(
    (row: FormMethodology) => {
      startEditing({
        id: row.id,
        name: row.name,
        regulation: row.regulation,
      });
      void navigate({ to: Routes.ADMIN_ITEMS });
    },
    [startEditing, navigate]
  );

  const handleDuplicate = useCallback(
    async (row: FormMethodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === row.id);
      try {
        const result = await duplicateMutation.mutateAsync(row.id);
        fieldArray.insert(index + 1, result);
        void enqueueSnackbar({
          message: "Metodología duplicada exitosamente",
          variant: "success",
          autoHideDuration: 2000,
        });
      } catch {
        void enqueueSnackbar({
          message: "Error al duplicar metodología",
          variant: "error",
          autoHideDuration: 2000,
        });
      }
    },
    [form, fieldArray, duplicateMutation, enqueueSnackbar]
  );

  const handleAddRow = useCallback(async () => {
    try {
      const newRow = await addMutation.mutateAsync({
        name: "Nueva metodología",
        description: null,
        regulation: "GHG Protocol",
        version: "1.0",
      });
      fieldArray.append(newRow);
      setEditingRowId(newRow.id);
      void enqueueSnackbar({
        message: "Nueva metodología creada",
        variant: "success",
        autoHideDuration: 2000,
      });
    } catch {
      void enqueueSnackbar({
        message: "Error al crear nueva metodología",
        variant: "error",
        autoHideDuration: 2000,
      });
    }
  }, [fieldArray, addMutation, enqueueSnackbar]);

  const handleDelete = useCallback(
    async (row: FormMethodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === row.id);
      if (index !== -1) {
        fieldArray.remove(index);
        await deleteMutation.mutateAsync(row.id);
        void enqueueSnackbar({
          message: "Metodología eliminada",
          variant: "success",
          autoHideDuration: 2000,
        });
      }
    },
    [form, fieldArray, deleteMutation, enqueueSnackbar]
  );

  // --- Column definitions via hook ---

  const columns = useMethodologyColumns({
    editingRowId,
    onCellChange: handleCellChange,
    onToggle: handleToggle,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onEdit: handleEdit,
    onDuplicate: handleDuplicate,
    onDelete: handleDelete,
    rows: currentRows,
  });

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Metodologías"
        onAddRow={handleAddRow}
        addLabel="Agregar fila"
      />
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gestiona las metodologías de cálculo. Haz clic en Editar para
          modificar alcances, subcategorías y factores de emisión. Siempre debe
          existir una única metodología activa.
        </Typography>
        <Box className="flex w-full">
          <StylizedDataGrid
            sx={(theme) => ({
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: theme.palette.grey[200],
              },
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
                py: 1,
              },
              "& .MuiDataGrid-cell .MuiTextField-root": {
                alignSelf: "center",
              },
            })}
            columns={columns}
            rows={currentRows}
            rowHeight={60}
            getRowId={(row: Methodology) => row.id}
            loading={isLoading}
          />
        </Box>
      </Box>
    </FormProvider>
  );
};
