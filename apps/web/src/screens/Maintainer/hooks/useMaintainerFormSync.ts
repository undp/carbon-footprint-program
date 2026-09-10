import { useEffect } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

interface UseMaintainerFormSyncOptions<
  TFormValues extends FieldValues,
  TFieldName extends keyof TFormValues & string,
  TServerRow,
> {
  form: UseFormReturn<TFormValues>;
  fieldName: TFieldName;
  editingRowId: string | null;
  methodologyVersionId: string | undefined;
  /**
   * The listing as the server returned it. Generic, not `unknown[]`, so
   * `toFormData` is checked against both ends: a renamed or removed response
   * field fails here instead of rendering as an empty cell.
   */
  serverData: TServerRow[] | undefined;
  toFormData: (data: TServerRow[]) => TFormValues[TFieldName];
}

export const useMaintainerFormSync = <
  TFormValues extends FieldValues,
  TFieldName extends keyof TFormValues & string,
  TServerRow,
>({
  form,
  fieldName,
  editingRowId,
  methodologyVersionId,
  serverData,
  toFormData,
}: UseMaintainerFormSyncOptions<TFormValues, TFieldName, TServerRow>) => {
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
