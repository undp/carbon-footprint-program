import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBlocker } from "@tanstack/react-router";
import { Box, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { FormProvider } from "react-hook-form";
import { uniqBy } from "lodash-es";
import { MethodologyVersionStatus } from "@repo/types";
import {
  useInitiatives,
  useCreateInitiative,
  useUpdateInitiative,
  useDeleteInitiative,
  useMethodologies,
  useSubcategories,
} from "@/api/query/maintainer";
import { StylizedDataGrid } from "@components";
import { IS_DEVELOPMENT } from "@/config/environment";
import { FormDebugPanel } from "@/devtools";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { MaintainerPageHeader } from "../../layout/MaintainerPageHeader";
import { UnsavedChangesDialog } from "../../components/UnsavedChangesDialog";
import {
  useInitiativesForm,
  toFormInitiative,
  type InitiativeFormRow,
} from "./useInitiativesForm";
import { useInitiativeColumns } from "./useInitiativeColumns";

const isNewRow = (id: string) => id.startsWith("temp_");

export const ReductionPlanMaintainerScreen: FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { data: initiatives, isLoading } = useInitiatives();

  const { data: methodologies = [] } = useMethodologies();
  const activeMethodologyVersionId = useMemo(
    () =>
      methodologies.find((m) => m.status === MethodologyVersionStatus.PUBLISHED)
        ?.id,
    [methodologies]
  );
  const { data: subcategoriesData = [] } = useSubcategories(
    activeMethodologyVersionId
  );

  const subcategories = useMemo(
    () =>
      subcategoriesData.map((s) => ({
        id: s.id,
        name: s.name,
        categoryId: s.category.id,
      })),
    [subcategoriesData]
  );
  const categories = useMemo(
    () =>
      uniqBy(
        subcategoriesData.map((s) => ({
          id: s.category.id,
          name: s.category.name,
        })),
        "id"
      ),
    [subcategoriesData]
  );

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const createMutation = useCreateInitiative();
  const updateMutation = useUpdateInitiative();
  const deleteMutation = useDeleteInitiative();

  const { form, fieldArray, handleCellChange } = useInitiativesForm();
  const currentRows = form.watch("initiatives");

  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!initiatives) return;
    form.reset({ initiatives: initiatives.map(toFormInitiative) });
  }, [initiatives, form]);

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = form.getValues("initiatives");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);
    const row = rows[rowIndex];
    if (!row) {
      setEditingRowId(null);
      return true;
    }

    const isValid = await form.trigger(`initiatives.${rowIndex}`);
    if (!isValid) {
      void enqueueSnackbar({
        message: "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (isNewRow(row.id)) {
      try {
        const result = await createMutation.mutateAsync({
          title: row.title,
          description: row.description,
          subcategoryId: row.subcategoryId,
        });
        fieldArray.update(rowIndex, { ...row, id: result.id });
        form.reset({ initiatives: form.getValues("initiatives") });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al crear iniciativa"),
          variant: "error",
        });
        return false;
      }
      setEditingRowId(null);
      return true;
    }

    const dirtyFields = form.formState.dirtyFields;
    const isRowDirty = dirtyFields.initiatives?.[rowIndex];

    try {
      if (isRowDirty) {
        await updateMutation.mutateAsync({
          id: row.id,
          data: {
            title: row.title,
            description: row.description,
            subcategoryId: row.subcategoryId,
          },
        });
        form.reset({ initiatives: form.getValues("initiatives") });
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
    fieldArray,
    createMutation,
    updateMutation,
    enqueueSnackbar,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;

    const rows = form.getValues("initiatives");
    const rowIndex = rows.findIndex(({ id }) => id === editingRowId);

    if (isNewRow(editingRowId)) {
      if (rowIndex !== -1) fieldArray.remove(rowIndex);
    } else {
      const original = initiatives?.find(({ id }) => id === editingRowId);
      if (original && rowIndex !== -1) {
        fieldArray.update(rowIndex, toFormInitiative(original));
      }
    }

    form.reset({ initiatives: form.getValues("initiatives") });
    setEditingRowId(null);
  }, [editingRowId, form, fieldArray, initiatives]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId) {
        const ok = await handleStopEditRow();
        if (!ok) return;
      }
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const newRow: InitiativeFormRow = {
      id: tempId,
      title: "",
      description: "",
      subcategoryId: "",
      categoryId: "",
    };
    fieldArray.append(newRow);
    setEditingRowId(tempId);
  }, [fieldArray]);

  const handleDelete = useCallback(
    async (row: InitiativeFormRow) => {
      try {
        const rows = form.getValues("initiatives");
        const index = rows.findIndex((r) => r.id === row.id);
        if (index === -1) return;
        if (editingRowId === row.id) setEditingRowId(null);
        if (!isNewRow(row.id)) {
          await deleteMutation.mutateAsync(row.id);
        }
        fieldArray.remove(index);
        form.reset({ initiatives: form.getValues("initiatives") });
      } catch (error) {
        void enqueueSnackbar({
          message: getApiErrorMessage(error, "Error al eliminar iniciativa"),
          variant: "error",
        });
      }
    },
    [form, fieldArray, editingRowId, deleteMutation, enqueueSnackbar]
  );

  const handleCategoryChange = useCallback(
    (rowIndex: number, categoryId: string) => {
      handleCellChange(rowIndex, "categoryId", categoryId);
      const current = form.getValues(`initiatives.${rowIndex}.subcategoryId`);
      if (current) {
        handleCellChange(rowIndex, "subcategoryId", "");
      }
    },
    [form, handleCellChange]
  );

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

  const columns = useInitiativeColumns({
    editingRowId,
    onCellChange: handleCellChange,
    onStartEditRow: handleStartEditRow,
    onStopEditRow: handleStopEditRow,
    onCancelEditRow: handleCancelEditRow,
    onDelete: handleDelete,
    onCategoryChange: handleCategoryChange,
    rows: currentRows,
    categories,
    subcategories,
  });

  return (
    <FormProvider {...form}>
      <MaintainerPageHeader
        title="Plan de reducción"
        onAddRow={handleAddRow}
        addDisabled={editingRowId !== null}
        addLabel="Agregar fila"
      />
      <Box className="rounded-sm bg-white p-3">
        {currentRows.length === 0 && !isLoading ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ m: 2, textAlign: "center" }}
          >
            Aun no hay iniciativas registradas
          </Typography>
        ) : (
          <form id="initiatives-form" noValidate>
            <Box className="flex w-full">
              <StylizedDataGrid
                sx={(theme) => ({
                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: theme.palette.grey[200],
                  },
                  "& .MuiDataGrid-row.row--editing": {
                    backgroundColor: theme.palette.grey[100],
                  },
                })}
                loading={isLoading}
                columns={columns}
                rows={currentRows}
                getRowHeight={() => "auto"}
                getRowId={(row: InitiativeFormRow) => row.id}
                getRowClassName={({ id }) =>
                  String(id) === editingRowId ? "row--editing" : ""
                }
              />
            </Box>
          </form>
        )}
      </Box>
      {IS_DEVELOPMENT && <FormDebugPanel control={form.control} />}
      <UnsavedChangesDialog
        open={status === "blocked"}
        onCancel={() => reset?.()}
        onConfirm={() => proceed?.()}
      />
    </FormProvider>
  );
};
