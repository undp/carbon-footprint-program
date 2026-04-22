import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SubcategoryFormSchema, SubcategoryForm } from "@repo/types";
import { Subcategory } from "../types";

export interface SubcategoriesFormValues {
  subcategories: SubcategoryForm[];
}

const subcategoriesFormSchema = z.object({
  subcategories: z.array(
    SubcategoryFormSchema.refine((row) => row.icon !== "", {
      message: "Ícono es requerido",
      path: ["icon"],
    })
  ),
});

/** Strip server-only / nested fields so the form only holds SubcategoryForm data. */
export function toFormSubcategory(s: Subcategory): SubcategoryForm {
  return {
    id: s.id,
    categoryId: s.category.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
    explanation: s.explanation,
    measurementUnitIds: s.measurementUnits.map((u) => u.id),
  };
}

export const useSubcategoriesForm = () => {
  const form = useForm<SubcategoriesFormValues>({
    defaultValues: { subcategories: [] },
    mode: "onBlur",
    resolver: zodResolver(subcategoriesFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "subcategories",
  });

  const handleCellChange = useCallback(
    (
      rowIndex: number,
      field: keyof SubcategoryForm,
      value: string | string[] | null
    ) => {
      const currentRow = form.getValues(`subcategories.${rowIndex}`);
      if (currentRow) {
        const updatedRow = { ...structuredClone(currentRow), [field]: value };
        fieldArray.update(rowIndex, updatedRow);
        form.setValue(`subcategories.${rowIndex}.${field}`, value as never, {
          shouldDirty: true,
        });
        void form.trigger(`subcategories.${rowIndex}.${field}`);
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
