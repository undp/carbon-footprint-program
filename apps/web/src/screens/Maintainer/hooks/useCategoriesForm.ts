import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type GetAllCategoriesResponse,
  CategoryFormSchema,
  CategoryForm,
} from "@repo/types";

type Category = GetAllCategoriesResponse[number];

export interface CategoriesFormValues {
  categories: CategoryForm[];
}

const categoriesFormSchema = z.object({
  categories: z.array(
    CategoryFormSchema.refine((row) => row.icon !== "", {
      message: "Ícono es requerido",
      path: ["icon"],
    })
  ),
});

/** Strip server-only fields so the form only holds CategoryForm data. */
export function toFormCategory(c: Category): CategoryForm {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    synonyms: c.synonyms,
    description: c.description,
    explanation: c.explanation,
    position: c.position,
  };
}

/**
 * The cells the grid can edit.
 *
 * `id` and `position` are assigned by the server, and `position` is a nullable
 * number, so leaving them in the union lets
 * `handleCellChange(i, "position", "abc")` type-check: RHF distributes
 * `setValue` over the path union, which widens the accepted value to include
 * the string this setter takes. Same exclusion as EditableSubcategoryField.
 */
export type EditableCategoryField = Exclude<
  keyof CategoryForm,
  "id" | "position"
>;

export const useCategoriesForm = () => {
  const form = useForm<CategoriesFormValues>({
    defaultValues: { categories: [] },
    mode: "onBlur",
    resolver: zodResolver(categoriesFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: EditableCategoryField, value: string) => {
      const currentRow = form.getValues(`categories.${rowIndex}`);
      if (currentRow) {
        const updatedRow = { ...structuredClone(currentRow), [field]: value };
        fieldArray.update(rowIndex, updatedRow);
        form.setValue(`categories.${rowIndex}.${field}`, value, {
          shouldDirty: true,
        });
        void form.trigger(`categories.${rowIndex}.${field}`);
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
