import { useEffect, useLayoutEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

interface UseMaintainerFormSyncOptions<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
  fieldName: keyof TFormValues & string;
  editingRowId: string | null;
  methodologyVersionId: string | undefined;
  serverData: unknown[] | undefined;
  toFormData: (data: unknown[]) => unknown[];
}

export const useMaintainerFormSync = <TFormValues extends FieldValues>({
  form,
  fieldName,
  editingRowId,
  methodologyVersionId,
  serverData,
  toFormData,
}: UseMaintainerFormSyncOptions<TFormValues>) => {
  const editingRowIdRef = useRef(editingRowId);
  useLayoutEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  // Reset form when methodology changes
  useEffect(() => {
    form.reset({ [fieldName]: [] } as unknown as TFormValues);
  }, [methodologyVersionId, form, fieldName]);

  // Sync server data to form when not editing
  useEffect(() => {
    if (editingRowIdRef.current !== null) return;
    if (!serverData) return;
    form.reset({
      [fieldName]: toFormData(serverData),
    } as unknown as TFormValues);
  }, [serverData, form, fieldName, toFormData]);
};
