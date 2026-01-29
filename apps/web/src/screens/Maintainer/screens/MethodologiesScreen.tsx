import { FC, useCallback } from "react";
import { useNavigate, useBlocker } from "@tanstack/react-router";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useMethodologies } from "@/api/query/maintainer";
import { Routes } from "@/interfaces/routes";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { ToggleCell } from "../components/ToggleCell";
import { ActionButtons } from "../components/ActionButtons";
import { EditFooter } from "../components/EditFooter";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { NORMATIVA_OPTIONS } from "../constants";
import { createEmptyMethodology } from "../mocks/methodologies.mock";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import { useMethodologiesForm } from "../hooks/useMethodologiesForm";
import { useSaveMethodologies } from "../hooks/useSaveMethodologies";
import type { Methodology } from "../types";
import { MethodologyEditorGrid } from "../components/MethodologyGrid";

export const MethodologiesScreen: FC = () => {
  const navigate = useNavigate();
  const { data: methodologies = [], isLoading } = useMethodologies();
  const { form, fieldArray, serverSnapshotRef } =
    useMethodologiesForm(methodologies);
  const { save, isSaving } = useSaveMethodologies();
  const startEditing = useMaintainerStore((s) => s.startEditing);
  const { enqueueSnackbar } = useSnackbar();
  const { isDirty, isValid } = form.formState;
  const currentRows = form.watch("methodologies");

  // Block navigation when there are pending changes
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty,
    enableBeforeUnload: () => isDirty,
    withResolver: true,
  });

  // --- Handlers that manipulate the field array ---

  const handleToggle = useCallback(
    (row: Methodology, checked: boolean) => {
      if (!checked) {
        void enqueueSnackbar({
          message: "Siempre debe haber una metodología activa",
          variant: "warning",
        });
        return;
      }
      const rows = form.getValues("methodologies");
      if (checked) {
        rows.forEach((m, i) => {
          if (m.activo && m.id !== row.id) {
            fieldArray.update(i, { ...m, activo: false });
          }
        });
      }
      const rowIndex = rows.findIndex((r) => r.id === row.id);
      if (rowIndex !== -1) {
        fieldArray.update(rowIndex, { ...row, activo: checked });
      }
    },
    [form, fieldArray, enqueueSnackbar]
  );

  const handleEdit = useCallback(
    (row: Methodology) => {
      startEditing({
        id: row.id,
        nombre: row.nombre,
        normativa: row.normativa,
      });
      void navigate({ to: Routes.MAINTAINER_SCOPES });
    },
    [startEditing, navigate]
  );

  const handleDuplicate = useCallback(
    (row: Methodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === row.id);
      const duplicate: Methodology = {
        ...row,
        id: crypto.randomUUID(),
        nombre: `${row.nombre} (copia)`,
        activo: false,
      };
      fieldArray.insert(index + 1, duplicate);
    },
    [form, fieldArray]
  );

  const handleAddRow = useCallback(() => {
    fieldArray.append(createEmptyMethodology());
  }, [fieldArray]);

  const handleDelete = useCallback(
    (row: Methodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === row.id);
      if (index !== -1) {
        fieldArray.remove(index);
      }
    },
    [form, fieldArray]
  );

  const processRowUpdate = useCallback(
    (newRow: Methodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === newRow.id);
      if (index !== -1) {
        fieldArray.update(index, newRow);
      }
      return newRow;
    },
    [form, fieldArray]
  );

  // --- Save / Discard ---

  const handleSave = useCallback(async () => {
    const current = form.getValues("methodologies");
    await save(current, serverSnapshotRef.current);
    serverSnapshotRef.current = current;
    form.reset({ methodologies: current });
  }, [form, save, serverSnapshotRef]);

  const handleDiscard = useCallback(() => {
    form.reset({ methodologies: serverSnapshotRef.current });
  }, [form, serverSnapshotRef]);

  // --- Column definitions ---

  const columns: GridColDef<Methodology>[] = [
    {
      field: "nombre",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Nombre",
      flex: 0.5,
      minWidth: 180,
    },
    {
      field: "descripcion",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Descripción",
      flex: 1.5,
      minWidth: 220,
    },
    {
      field: "normativa",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Normativa",
      width: 150,
      type: "singleSelect",
      valueOptions: NORMATIVA_OPTIONS.map((o) => o.value),
    },
    {
      field: "version",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Versión",
      width: 100,
    },
    {
      field: "activo",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Estado",
      width: 90,
      renderCell: (params: GridRenderCellParams<Methodology>) => (
        <ToggleCell
          value={params.row.activo}
          onChange={(checked) => handleToggle(params.row, checked)}
        />
      ),
    },
    {
      field: "actions",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Acciones",
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Methodology>) => (
        <ActionButtons
          isActiveRow={params.row.activo}
          onEdit={!params.row.activo ? () => handleEdit(params.row) : undefined}
          onView={params.row.activo ? () => handleEdit(params.row) : undefined}
          onDuplicate={() => handleDuplicate(params.row)}
          onDelete={() => handleDelete(params.row)}
        />
      ),
    },
  ];

  return (
    <>
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
        <MethodologyEditorGrid
          columns={columns}
          rows={currentRows}
          loading={isLoading || isSaving}
          processRowUpdate={processRowUpdate}
        />
      </Box>
      {isDirty && (
        <EditFooter
          onCancel={handleDiscard}
          onSave={handleSave}
          isSaving={isSaving}
          cancelLabel="Descartar"
          saveLabel="Guardar cambios"
          saveDisabled={!isValid}
        />
      )}
      <UnsavedChangesDialog
        open={blocker.status === "blocked"}
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
};
