import { useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type CreateMethodologyResponse,
  MethodologyVersionFormSchema,
  MethodologyVersionForm,
} from "@repo/types";

export interface MethodologiesFormValues {
  methodologies: MethodologyVersionForm[];
}

const methodologiesFormSchema = z.object({
  methodologies: z.array(MethodologyVersionFormSchema),
});

export const useMethodologiesForm = (
  serverData: CreateMethodologyResponse[]
) => {
  const form = useForm<MethodologiesFormValues>({
    defaultValues: { methodologies: [] },
    mode: "onBlur",
    resolver: zodResolver(methodologiesFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "methodologies",
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (serverData.length > 0 && !initialized.current) {
      // Deep clone to avoid "read-only" errors (React Query data is immutable)
      const clonedData = structuredClone(serverData);
      form.reset({ methodologies: clonedData });
      initialized.current = true;
    }
  }, [serverData, form]);

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof MethodologyVersionForm, value: string) => {
      const currentRow = form.getValues(`methodologies.${rowIndex}`);
      if (currentRow) {
        // Clone the row and update the field to avoid mutating frozen objects
        const updatedRow = { ...structuredClone(currentRow), [field]: value };
        fieldArray.update(rowIndex, updatedRow);
        // Manually mark as dirty since fieldArray.update() doesn't track dirty state well
        form.setValue(`methodologies.${rowIndex}.${field}`, value, {
          shouldDirty: true,
        });
        void form.trigger(`methodologies.${rowIndex}.${field}`);
      }
    },
    [form, fieldArray]
  );

  return {
    form,
    fieldArray,
    handleCellChange,
  };
};
