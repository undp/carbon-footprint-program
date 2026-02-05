import { useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Methodology } from "@repo/types";

export type FormMethodology = Omit<
  Methodology,
  | "createdAt"
  | "updatedAt"
  | "countryId"
  | "createdById"
  | "updatedById"
  | "status"
>;

export interface MethodologiesFormValues {
  methodologies: FormMethodology[];
}

const methodologiesFormSchema = z.object({
  methodologies: z.array(
    z.object({
      id: z.string().min(1, "ID inválido"),
      name: z.string().min(1, "Campo obligatorio"),
      description: z.string().min(1, "Campo obligatorio"),
      regulation: z.string().min(1, "Campo obligatorio"),
      version: z.string().min(1, "Campo obligatorio"),
    })
  ),
});

export const useMethodologiesForm = (serverData: Methodology[]) => {
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
    (rowIndex: number, field: keyof FormMethodology, value: string) => {
      const currentRow = form.getValues(`methodologies.${rowIndex}`);
      if (currentRow) {
        fieldArray.update(rowIndex, { ...currentRow, [field]: value });
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
