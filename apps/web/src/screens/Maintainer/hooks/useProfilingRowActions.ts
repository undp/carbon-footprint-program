import { useCallback, useState } from "react";
import {
  useFieldArray,
  type FieldArray,
  type FieldArrayPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { useSnackbar } from "notistack";
import {
  getApiErrorCode,
  getApiErrorMessage,
} from "@/utils/getApiErrorMessage";

interface ServerRowBase {
  id: string;
  isInUse: boolean;
}

interface MutationLike<TInput, TOutput> {
  mutateAsync: (input: TInput) => Promise<TOutput>;
}

export interface UseProfilingRowActionsOptions<
  TFormValues extends FieldValues,
  TServerRow extends ServerRowBase,
  TFormRow extends { id: string },
  TCreateBody,
  TUpdateBody,
> {
  form: UseFormReturn<TFormValues>;
  fieldArray: ReturnType<
    typeof useFieldArray<TFormValues, FieldArrayPath<TFormValues>>
  >;
  /** Form-array key, e.g. "sectors" | "subsectors" | etc. */
  fieldName: FieldArrayPath<TFormValues>;
  serverRows: TServerRow[] | undefined;
  toFormRow: (server: TServerRow) => TFormRow;
  toCreateBody: (row: TFormRow) => TCreateBody;
  /** Returns null if the form row is identical to the server row (no PATCH needed). */
  diffUpdateBody: (
    formRow: TFormRow,
    serverRow: TServerRow
  ) => TUpdateBody | null;
  /** Whether the diff includes any field that user-facing data depends on (drives InUseWarning). */
  visibleFieldsChanged: (body: TUpdateBody) => boolean;
  newRowDefaults: () => TFormRow;
  createMutation: MutationLike<TCreateBody, TServerRow>;
  updateMutation: MutationLike<{ id: string; body: TUpdateBody }, TServerRow>;
  deleteMutation: MutationLike<string, unknown>;
  restoreMutation: MutationLike<string, unknown>;
  editingRowId: string | null;
  setEditingRowId: (id: string | null) => void;
  isNewRow: (id: string) => boolean;
  successMessages: {
    create: string;
    update: string;
    delete: string;
    restore: string;
  };
  errorMessages: {
    create: string;
    update: string;
    delete: string;
    restore: string;
    validation?: string;
  };
}

export interface PendingPatch<TUpdateBody> {
  id: string;
  body: TUpdateBody;
}

export const useProfilingRowActions = <
  TFormValues extends FieldValues,
  TServerRow extends ServerRowBase,
  TFormRow extends { id: string },
  TCreateBody,
  TUpdateBody,
>({
  form,
  fieldArray,
  fieldName,
  serverRows,
  toFormRow,
  toCreateBody,
  diffUpdateBody,
  visibleFieldsChanged,
  newRowDefaults,
  createMutation,
  updateMutation,
  deleteMutation,
  restoreMutation,
  editingRowId,
  setEditingRowId,
  isNewRow,
  successMessages,
  errorMessages,
}: UseProfilingRowActionsOptions<
  TFormValues,
  TServerRow,
  TFormRow,
  TCreateBody,
  TUpdateBody
>) => {
  const { enqueueSnackbar } = useSnackbar();
  const [pendingPatch, setPendingPatch] =
    useState<PendingPatch<TUpdateBody> | null>(null);
  const [restoreBlockedMessage, setRestoreBlockedMessage] = useState<
    string | null
  >(null);

  const getFormRows = useCallback(
    () =>
      form.getValues(
        fieldName as unknown as Parameters<typeof form.getValues>[0]
      ) as unknown as TFormRow[],
    [form, fieldName]
  );

  const resetFormToCurrent = useCallback(() => {
    form.reset({
      [fieldName]: form.getValues(
        fieldName as unknown as Parameters<typeof form.getValues>[0]
      ),
    } as unknown as TFormValues);
  }, [form, fieldName]);

  const dispatchUpdate = useCallback(
    async (id: string, body: TUpdateBody): Promise<boolean> => {
      try {
        const result = await updateMutation.mutateAsync({ id, body });
        const rows = getFormRows();
        const idx = rows.findIndex((r) => r.id === id);
        if (idx !== -1) {
          fieldArray.update(
            idx,
            toFormRow(result) as unknown as FieldArray<
              TFormValues,
              FieldArrayPath<TFormValues>
            >
          );
        }
        resetFormToCurrent();
        enqueueSnackbar({
          message: successMessages.update,
          variant: "success",
        });
        setEditingRowId(null);
        return true;
      } catch (error) {
        enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessages.update),
          variant: "error",
        });
        return false;
      }
    },
    [
      updateMutation,
      getFormRows,
      fieldArray,
      toFormRow,
      resetFormToCurrent,
      enqueueSnackbar,
      successMessages.update,
      errorMessages.update,
      setEditingRowId,
    ]
  );

  const handleStopEditRow = useCallback(async (): Promise<boolean> => {
    if (!editingRowId) return true;

    const rows = getFormRows();
    const rowIndex = rows.findIndex((r) => r.id === editingRowId);
    const row = rows[rowIndex];
    if (!row) {
      setEditingRowId(null);
      return true;
    }

    const isValid = await form.trigger(
      `${fieldName}.${rowIndex}` as Parameters<typeof form.trigger>[0]
    );
    if (!isValid) {
      enqueueSnackbar({
        message:
          errorMessages.validation ?? "Corrige los errores antes de guardar",
        variant: "error",
      });
      return false;
    }

    if (isNewRow(row.id)) {
      try {
        const result = await createMutation.mutateAsync(toCreateBody(row));
        fieldArray.update(
          rowIndex,
          toFormRow(result) as unknown as FieldArray<
            TFormValues,
            FieldArrayPath<TFormValues>
          >
        );
        resetFormToCurrent();
        enqueueSnackbar({
          message: successMessages.create,
          variant: "success",
        });
        setEditingRowId(null);
        return true;
      } catch (error) {
        enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessages.create),
          variant: "error",
        });
        return false;
      }
    }

    const serverRow = serverRows?.find((r) => r.id === editingRowId);
    if (!serverRow) {
      setEditingRowId(null);
      return true;
    }

    const body = diffUpdateBody(row, serverRow);
    if (!body) {
      setEditingRowId(null);
      return true;
    }

    if (visibleFieldsChanged(body) && serverRow.isInUse) {
      // Defer until admin confirms in InUseWarningDialog. Keep the row in edit mode
      // so a cancel preserves the dirty values.
      setPendingPatch({ id: serverRow.id, body });
      return false;
    }

    return dispatchUpdate(serverRow.id, body);
  }, [
    editingRowId,
    getFormRows,
    form,
    fieldName,
    enqueueSnackbar,
    errorMessages.validation,
    errorMessages.create,
    isNewRow,
    createMutation,
    toCreateBody,
    fieldArray,
    toFormRow,
    resetFormToCurrent,
    successMessages.create,
    setEditingRowId,
    serverRows,
    diffUpdateBody,
    visibleFieldsChanged,
    dispatchUpdate,
  ]);

  const handleCancelEditRow = useCallback(() => {
    if (!editingRowId) return;
    const rows = getFormRows();
    const rowIndex = rows.findIndex((r) => r.id === editingRowId);
    if (rowIndex === -1) {
      setEditingRowId(null);
      return;
    }
    if (isNewRow(editingRowId)) {
      fieldArray.remove(rowIndex);
    } else {
      const original = serverRows?.find((r) => r.id === editingRowId);
      if (original) {
        fieldArray.update(
          rowIndex,
          toFormRow(original) as unknown as FieldArray<
            TFormValues,
            FieldArrayPath<TFormValues>
          >
        );
      }
    }
    resetFormToCurrent();
    setEditingRowId(null);
  }, [
    editingRowId,
    getFormRows,
    isNewRow,
    fieldArray,
    serverRows,
    toFormRow,
    resetFormToCurrent,
    setEditingRowId,
  ]);

  const handleStartEditRow = useCallback(
    async (rowId: string) => {
      if (editingRowId === rowId) return;
      if (editingRowId) {
        const success = await handleStopEditRow();
        if (!success) return;
      }
      setEditingRowId(rowId);
    },
    [editingRowId, handleStopEditRow, setEditingRowId]
  );

  const handleAddRow = useCallback(() => {
    const newRow = newRowDefaults();
    fieldArray.append(
      newRow as unknown as FieldArray<TFormValues, FieldArrayPath<TFormValues>>
    );
    setEditingRowId(newRow.id);
  }, [newRowDefaults, fieldArray, setEditingRowId]);

  const handleDelete = useCallback(
    async (row: TFormRow) => {
      const rows = getFormRows();
      const index = rows.findIndex((r) => r.id === row.id);
      if (index === -1) return;
      try {
        if (editingRowId === row.id) setEditingRowId(null);
        if (!isNewRow(row.id)) {
          await deleteMutation.mutateAsync(row.id);
        }
        fieldArray.remove(index);
        resetFormToCurrent();
        enqueueSnackbar({
          message: successMessages.delete,
          variant: "success",
        });
      } catch (error) {
        enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessages.delete),
          variant: "error",
        });
      }
    },
    [
      getFormRows,
      editingRowId,
      setEditingRowId,
      isNewRow,
      deleteMutation,
      fieldArray,
      resetFormToCurrent,
      enqueueSnackbar,
      successMessages.delete,
      errorMessages.delete,
    ]
  );

  const handleRestore = useCallback(
    async (row: TFormRow) => {
      try {
        await restoreMutation.mutateAsync(row.id);
        enqueueSnackbar({
          message: successMessages.restore,
          variant: "success",
        });
      } catch (error) {
        // PARENT_NOT_ACTIVE means the parent (sector / subsector) is soft-deleted.
        // Show a dedicated dialog with the backend's localized message instead of a
        // generic snackbar so the user knows which parent to restore first.
        if (getApiErrorCode(error) === "PARENT_NOT_ACTIVE") {
          setRestoreBlockedMessage(
            getApiErrorMessage(error, errorMessages.restore)
          );
          return;
        }
        enqueueSnackbar({
          message: getApiErrorMessage(error, errorMessages.restore),
          variant: "error",
        });
      }
    },
    [
      restoreMutation,
      enqueueSnackbar,
      successMessages.restore,
      errorMessages.restore,
    ]
  );

  const dismissRestoreBlocked = useCallback(() => {
    setRestoreBlockedMessage(null);
  }, []);

  const dispatchPendingPatch = useCallback(async () => {
    if (!pendingPatch) return;
    const { id, body } = pendingPatch;
    setPendingPatch(null);
    await dispatchUpdate(id, body);
  }, [pendingPatch, dispatchUpdate]);

  const cancelPendingPatch = useCallback(() => {
    setPendingPatch(null);
  }, []);

  return {
    handleAddRow,
    handleStartEditRow,
    handleStopEditRow,
    handleCancelEditRow,
    handleDelete,
    handleRestore,
    pendingPatch,
    dispatchPendingPatch,
    cancelPendingPatch,
    restoreBlockedMessage,
    dismissRestoreBlocked,
  };
};
