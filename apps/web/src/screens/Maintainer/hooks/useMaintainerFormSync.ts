import { useEffect } from "react";
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
  // Reset form when methodology changes
  useEffect(() => {
    form.reset({ [fieldName]: [] } as unknown as TFormValues);
  }, [methodologyVersionId, form, fieldName]);

  // Sync server data to form when not editing. `editingRowId` is a dependency
  // so that a server refetch that lands during edit mode is replayed once the
  // user exits that mode, preventing a stale grid.
  useEffect(() => {
    if (editingRowId !== null) return;
    if (!serverData) return;
    form.reset({
      [fieldName]: toFormData(serverData),
    } as unknown as TFormValues);
  }, [serverData, editingRowId, form, fieldName, toFormData]);
};
