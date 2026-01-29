import { FC, useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
  useMethodologies,
  useUpdateMethodology,
  useAddMethodology,
  useDeleteMethodology,
} from "@/api/query/maintainer";
import { Routes } from "@/interfaces/routes";
import { MaintainerPageHeader } from "../layout/MaintainerPageHeader";
import { ToggleCell } from "../components/ToggleCell";
import { ActionButtons } from "../components/ActionButtons";
import { NORMATIVA_OPTIONS } from "../constants";
import { createEmptyMethodology } from "../mocks/methodologies.mock";
import { useMaintainerStore } from "../hooks/useMaintainerStore";
import { useMethodologiesForm } from "../hooks/useMethodologiesForm";
import type { Methodology } from "../types";
import { MethodologyEditorGrid } from "../components/MethodologyGrid";

export const MethodologiesScreen: FC = () => {
  const navigate = useNavigate();
  const { data: methodologies = [], isLoading } = useMethodologies();
  const { form, fieldArray } = useMethodologiesForm(methodologies);
  const updateMutation = useUpdateMethodology();
  const addMutation = useAddMethodology();
  const deleteMutation = useDeleteMethodology();
  const startEditing = useMaintainerStore((s) => s.startEditing);
  const { enqueueSnackbar } = useSnackbar();
  const currentRows = form.watch("methodologies");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const isSaving =
    updateMutation.isPending ||
    addMutation.isPending ||
    deleteMutation.isPending;

  // --- Handlers that manipulate the field array ---

  const handleStartEditRow = useCallback((rowId: string) => {
    setEditingRowId(rowId);
  }, []);

  const handleStopEditRow = useCallback(() => {
    setEditingRowId(null);
  }, []);

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
            const updatedRow = { ...m, activo: false };
            fieldArray.update(i, updatedRow);
            updateMutation.mutate(updatedRow);
          }
        });
      }
      const rowIndex = rows.findIndex((r) => r.id === row.id);
      if (rowIndex !== -1) {
        const updatedRow = { ...row, activo: checked };
        fieldArray.update(rowIndex, updatedRow);
        updateMutation.mutate(updatedRow);
      }
    },
    [form, fieldArray, enqueueSnackbar, updateMutation]
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
      addMutation.mutate(duplicate);
    },
    [form, fieldArray, addMutation]
  );

  const handleAddRow = useCallback(() => {
    const newRow = createEmptyMethodology();
    fieldArray.append(newRow);
    addMutation.mutate(newRow, {
      onSuccess: () => {
        setEditingRowId(newRow.id);
      },
    });
  }, [fieldArray, addMutation]);

  const handleDelete = useCallback(
    (row: Methodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === row.id);
      if (index !== -1) {
        fieldArray.remove(index);
        deleteMutation.mutate(row.id);
      }
    },
    [form, fieldArray, deleteMutation]
  );

  const processRowUpdate = useCallback(
    (newRow: Methodology) => {
      const rows = form.getValues("methodologies");
      const index = rows.findIndex((r) => r.id === newRow.id);
      if (index !== -1) {
        fieldArray.update(index, newRow);
        updateMutation.mutate(newRow);
      }
      return newRow;
    },
    [form, fieldArray, updateMutation]
  );

  // --- Column definitions ---

  const columns: GridColDef<Methodology>[] = [
    {
      field: "nombre",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Nombre",
      flex: 0.5,
      minWidth: 180,
      editable: true,
    },
    {
      field: "descripcion",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Descripción",
      flex: 1.5,
      minWidth: 220,
      editable: true,
    },
    {
      field: "normativa",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Normativa",
      width: 150,
      type: "singleSelect",
      valueOptions: NORMATIVA_OPTIONS.map((o) => o.value),
      editable: true,
    },
    {
      field: "version",
      cellClassName: "content-center max-h-[56px]",
      headerName: "Versión",
      width: 100,
      editable: true,
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
          isEditing={editingRowId === params.row.id}
          onStartEditCells={() => handleStartEditRow(params.row.id)}
          onStopEditCells={handleStopEditRow}
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
          editingRowId={editingRowId}
        />
      </Box>
    </>
  );
};
