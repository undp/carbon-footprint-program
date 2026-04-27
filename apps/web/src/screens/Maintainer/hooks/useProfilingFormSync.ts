import { useEffect, useLayoutEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

interface UseProfilingFormSyncOptions<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
  fieldName: keyof TFormValues & string;
  editingRowId: string | null;
  serverData: unknown[] | undefined;
  toFormData: (data: unknown[]) => unknown[];
}

/**
 * Sync server data into the form array when the user is not mid-edit. Uses a ref so the
 * sync effect doesn't re-fire when `editingRowId` toggles, only when `serverData` changes.
 */
export const useProfilingFormSync = <TFormValues extends FieldValues>({
  form,
  fieldName,
  editingRowId,
  serverData,
  toFormData,
}: UseProfilingFormSyncOptions<TFormValues>) => {
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!serverData) return;
    form.reset({
      [fieldName]: toFormData(serverData),
    } as unknown as TFormValues);
  }, [serverData, form, fieldName, toFormData]);
};
