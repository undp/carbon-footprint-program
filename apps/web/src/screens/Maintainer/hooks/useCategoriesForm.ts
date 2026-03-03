import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type GetAllCategoriesResponse, CategoryBaseSchema } from "@repo/types";

type Category = GetAllCategoriesResponse[number];

export type FormCategory = Pick<
  Category,
  | "id"
  | "name"
  | "icon"
  | "color"
  | "synonyms"
  | "description"
  | "examples"
  | "position"
>;

export interface CategoriesFormValues {
  categories: FormCategory[];
}

const categoriesFormSchema = z.object({
  categories: z.array(
    CategoryBaseSchema.pick({
      id: true,
      name: true,
      icon: true,
      color: true,
      synonyms: true,
      description: true,
      examples: true,
      position: true,
    }).extend({
      id: z.string().min(1), // Override IdSchema to allow temp_ IDs for new rows
    })
  ),
});

/** Strip server-only fields so the form only holds FormCategory data. */
export function toFormCategory(c: Category): FormCategory {
  return {
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    synonyms: c.synonyms,
    description: c.description,
    examples: c.examples,
    position: c.position,
  };
}

export const useCategoriesForm = (initialCategories: FormCategory[]) => {
  const form = useForm<CategoriesFormValues>({
    defaultValues: { categories: initialCategories },
    mode: "onBlur",
    resolver: zodResolver(categoriesFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof FormCategory, value: string) => {
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
