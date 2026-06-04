import { FC, useCallback, useEffect, useState } from "react";
import { useNavigate, useBlocker } from "@tanstack/react-router";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
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
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { useDownloadMethodology } from "@/hooks/useDownloadMethodology";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import { useMethodologiesForm } from "../hooks/useMethodologiesForm";
import { useMethodologyColumns } from "../hooks/useMethodologyColumns";
import { MethodologyVersionStatus, MethodologyVersionForm } from "@repo/types";
import { FormDebugPanel } from "@/devtools";
import { IS_DEVELOPMENT } from "@/config/environment";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { MaintainerDataGrid } from "../components/MaintainerDataGrid";
import {
  EditModeToolbar,
  EDIT_MODE_TOOLBAR_HEIGHT,
} from "../components/EditModeToolbar";

const METHODOLOGIES_MAINTAINER_EXPLANATION_SLUGS = {
  MAIN: "methodologies-maintainer",
} as const;

export const MethodologiesMaintainerScreen: FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [exitEditModeOpen, setExitEditModeOpen] = useState(false);

  // --- Data fetching ---
  const { data: methodologies = [], isLoading } = useMethodologies();
  const addMutation = useAddMethodology();
  const updateMutation = useUpdateMethodology();
  const deleteMutation = useDeleteMethodology();
  const duplicateMutation = useDuplicateMethodology();
  const { download: downloadMethodology, downloadingId: downloadingRowId } =
    useDownloadMethodology();

  // --- Form setup ---
  const { form, fieldArray, handleCellChange } =
    useMethodologiesForm(methodologies);
  const startEditing = useMaintainerStore((s) => s.startEditing);
  const selectMethodology = useMaintainerStore((s) => s.selectMethodology);
  const editingMethodology = useMaintainerStore((s) => s.editingMethodology);
  const stopEditing = useMaintainerStore((s) => s.stopEditing);
  const currentRows = form.watch("methodologies");

  const isNewRow = useCallback((id: string) => id.startsWith("temp_"), []);

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("methodologies");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];

    // Validate the row before allowing exit
    const isValid = await form.trigger(`methodologies.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (row && isNewRow(row.id)) {
      // New row - create in database
      try {
        const result = await addMutation.mutateAsync({
          name: row.name,
          description: row.description,
          regulation: row.regulation,
          version: row.version,
        });
        // Replace temp row with the real one from the server
        fieldArray.update(rowIndex, result);
        // Reset form defaults so the new row is no longer considered dirty
        form.reset({ methodologies: form.getValues("methodologies") });
        void enqueueSnackbar({
          message: "Metodología creada exitosamente",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear metodología"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }
    // Existing row - update if dirty
    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.methodologies?.[rowIndex];

    try {
      if (row && isRowDirty) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: {
            name: row.name,
            description: row.description,
            regulation: row.regulation,
            version: row.version,
          },
        });
        form.reset({ methodologies: form.getValues("methodologies") });
        void enqueueSnackbar({
          message: "Cambios guardados satisfactoriamente",
          variant: "success",
        });
      }
    } catch (error) {
      void enqueueSnackbar({
        message: getApiErrorMessage(error, "Error al guardar cambios"),
        variant: "error",
      });
      return false;
    }
    setEditingRowId(null);
    return true;
  }, [
    editingRowId,
    form,
    isNewRow,
    addMutation,
    fieldArray,
    updateMutation,
    enqueueSnackbar,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("methodologies");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      // New unsaved row — remove it
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      // Existing row — restore original values from server data
      const original = methodologies.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, structuredClone(original));
      }
    }

    form.reset({ methodologies: form.getValues("methodologies") });
    setEditingRowId(null);
  }, [editingRowId, form, isNewRow, fieldArray, methodologies]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) {
        const success = await handleStopEditRow();
        if (!success) return;
      }
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow]
  );

  const handleToggle = useCallback(
    (row: MethodologyVersionForm, checked: boolean) => {
      // Don't allow unchecking the active methodology
      if (!checked) {
        void enqueueSnackbar({
          message: "Siempre debe haber una metodología activa",
          variant: "warning",
        });
        return;
      }
      // Don't allow toggling for unsaved rows
      if (isNewRow(row.id)) {
        void enqueueSnackbar({
          message: "Guarda la metodología antes de cambiar su estado",
          variant: "warning",
        });
        return;
      }

      const rows = form.getValues("methodologies");
      const previousRows = structuredClone(rows);

      // Optimistically update: set selected row to PUBLISHED, others to UNPUBLISHED
      const newStatus = checked
        ? MethodologyVersionStatus.PUBLISHED
        : MethodologyVersionStatus.UNPUBLISHED;
      const updatedRows = rows.map((r) => ({
        ...r,
        status: checked
          ? r.id === row.id
            ? MethodologyVersionStatus.PUBLISHED
            : MethodologyVersionStatus.UNPUBLISHED
          : r.id === row.id
            ? MethodologyVersionStatus.UNPUBLISHED
            : r.status,
      })) as MethodologyVersionForm[];
      fieldArray.replace(updatedRows);
      form.reset({ methodologies: updatedRows });

      updateMutation.mutate(
        {
          id: row.id,
          data: { status: newStatus },
        },
        {
          onSuccess: () => {
            void enqueueSnackbar({
              message: checked
                ? "Metodología activada"
                : "Metodología desactivada",
              variant: "success",
            });
          },
          onError: (error) => {
            // Revert optimistic update on error
            fieldArray.replace(previousRows);
            form.reset({ methodologies: previousRows });
            void enqueueSnackbar({
              message: getApiErrorMessage(
                error,
                "Error al cambiar el estado de la metodología"
              ),
              variant: "error",
            });
          },
        }
      );
    },
    [form, fieldArray, isNewRow, updateMutation, enqueueSnackbar]
  );

  const handleView = useCallback(
    (row: MethodologyVersionForm) => {
      selectMethodology({
        id: row.id,
        name: row.name,
        regulation: row.regulation,
      });
      void navigate({ to: Routes.ADMIN_CATEGORIES });
    },
    [selectMethodology, navigate]
  );

  const handleEdit = useCallback(
    (row: MethodologyVersionForm) => {
      if (isNewRow(row.id)) {
        void enqueueSnackbar({
          message: "Guarda la metodología antes de editarla",
          variant: "warning",
        });
        return;
      }
      startEditing({
        id: row.id,
        name: row.name,
        regulation: row.regulation,
      });
      void navigate({ to: Routes.ADMIN_CATEGORIES });
    },
    [isNewRow, enqueueSnackbar, startEditing, navigate]
  );

  const handleExitEditMode = useCallback(() => {
    setExitEditModeOpen(false);
    stopEditing();
  }, [stopEditing]);

  const handleDuplicate = useCallback(
    async (row: MethodologyVersionForm) => {
      if (isNewRow(row.id)) {
        void enqueueSnackbar({
          message: "Guarda la metodología antes de duplicarla",
          variant: "warning",
        });
        return;
      }
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === row.id);
      try {
        const result = await duplicateMutation.mutateAsync(row.id);
        fieldArray.insert(index + 1, result);
        form.reset({ methodologies: form.getValues("methodologies") });
        void enqueueSnackbar({
          message: "Metodología duplicada exitosamente",
          variant: "success",
        });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al duplicar metodología"),
          variant: "error",
        });
      }
    },
    [isNewRow, enqueueSnackbar, form, fieldArray, duplicateMutation]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const newRow: MethodologyVersionForm = {
      id: tempId,
      name: "",
      description: "",
      regulation: "",
      version: "",
      status: MethodologyVersionStatus.UNPUBLISHED,
    };
    fieldArray.prepend(newRow);
    setEditingRowId(tempId);
  }, [fieldArray]);

  // Scroll to top when a new row is added — the new row is prepended to the top
  // of the grid so it remains visible regardless of viewport scroll position.
  useEffect(() => {
    if (!editingRowId?.startsWith("temp_")) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [editingRowId]);

  const handleDelete = useCallback(
    async (row: MethodologyVersionForm) => {
      try {
        const rows = form.getValues("methodologies");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index !== -1) {
          // Clear editing state if deleting the row being edited
          if (editingRowId === row.id) {
            setEditingRowId(null);
          }
          // Only call API if it's not a new unsaved row
          if (!isNewRow(row.id)) {
            await deleteMutation.mutateAsync(row.id);
          }
          fieldArray.remove(index);
          form.reset({ methodologies: form.getValues("methodologies") });
          void enqueueSnackbar({
            message: "Metodología eliminada",
            variant: "success",
          });
        }
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar metodología"),
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, isNewRow, deleteMutation, enqueueSnackbar]
  );

  // --- Block navigation while editing ---
  // TODO: replicate on inventory steps. May be create a reusable hook
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: () => form.formState.isDirty,
    enableBeforeUnload: form.formState.isDirty,
    withResolver: true,
  });

  // --- Column definitions via hook ---

  const handleDownloadExcel = useCallback(
    (row: MethodologyVersionForm) => {
      void downloadMethodology(row.id);
    },
    [downloadMethodology]
  );

  const columns = useMethodologyColumns({
    editingRowId,
    onCellChange: handleCellChange,
    onToggle: handleToggle,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onEdit: handleEdit,
    onView: handleView,
    onDuplicate: handleDuplicate,
    onDelete: handleDelete,
    onDownloadExcel: handleDownloadExcel,
    downloadingRowId,
    rows: currentRows,
  });

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Metodologías"
        subtitle="Gestiona las metodologías de cálculo. Haz clic en el ícono de
          ajustes para modificar alcances, subcategorías y factores de emisión.
          Siempre debe existir una única metodología activa."
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
        explanationSlug={METHODOLOGIES_MAINTAINER_EXPLANATION_SLUGS.MAIN}
      />
      <Box
        className="rounded-sm bg-white p-3"
        sx={
          editingMethodology
            ? { pb: `${EDIT_MODE_TOOLBAR_HEIGHT}px` }
            : undefined
        }
      >
        <form id="methodologies-form" noValidate>
          <Box className="flex w-full">
            <MaintainerDataGrid<MethodologyVersionForm>
              editingRowId={editingRowId}
              searchable={{
                fuseOptions: {
                  keys: ["name", "description", "regulation", "version"],
                },
                placeholder: "Buscar metodología...",
                disableExport: true,
              }}
              showToolbar
              loading={isLoading}
              columns={columns}
              rows={currentRows}
              rowHeight={60}
              getRowId={(row: MethodologyVersionForm) => row.id}
            />
          </Box>
        </form>
      </Box>
      {editingMethodology && (
        <EditModeToolbar
          methodologyName={editingMethodology.name}
          onExitClick={() => setExitEditModeOpen(true)}
        />
      )}
      <Dialog
        open={exitEditModeOpen}
        onClose={() => setExitEditModeOpen(false)}
      >
        <DialogTitle>Salir de modo edición</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Estás a punto de salir del modo edición de{" "}
            <strong>{editingMethodology?.name ?? ""}</strong>. Podrás volver a
            ajustarla desde esta pantalla cuando quieras.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitEditModeOpen(false)}>Cancelar</Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleExitEditMode}
          >
            Salir
          </Button>
        </DialogActions>
      </Dialog>
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
    </FormProvider>
  );
};
