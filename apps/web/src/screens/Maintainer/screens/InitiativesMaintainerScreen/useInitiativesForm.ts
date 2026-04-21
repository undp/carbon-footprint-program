import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH,
  REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH,
} from "@repo/constants";
import type { AdminInitiativeListItem } from "@repo/types";

export interface InitiativeFormRow {
  id: string;
  title: string;
  description: string;
  subcategoryId: string;
  /** UI-only — filters subcategory selector, never sent to API. */
  categoryId: string;
}

export interface InitiativesFormValues {
  initiatives: InitiativeFormRow[];
}

const InitiativeRowSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .trim()
    .min(1, "Requerido")
    .max(
      REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH,
      `Máximo ${REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH} caracteres`
    ),
  description: z
    .string()
    .trim()
    .min(1, "Requerido")
    .max(
      REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH,
      `Máximo ${REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH} caracteres`
    ),
  subcategoryId: z.string().min(1, "Requerido"),
  categoryId: z.string().min(1, "Requerido"),
});

const initiativesFormSchema = z.object({
  initiatives: z.array(InitiativeRowSchema),
});

export function toFormInitiative(
  item: AdminInitiativeListItem
): InitiativeFormRow {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    subcategoryId: item.subcategoryId,
    categoryId: item.subcategory.category.id,
  };
}

export const useInitiativesForm = () => {
  const form = useForm<InitiativesFormValues>({
    defaultValues: { initiatives: [] },
    mode: "onBlur",
    resolver: zodResolver(initiativesFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "initiatives",
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof InitiativeFormRow, value: string) => {
      const currentRow = form.getValues(`initiatives.${rowIndex}`);
      if (!currentRow) return;
      const updatedRow = { ...structuredClone(currentRow), [field]: value };
      fieldArray.update(rowIndex, updatedRow);
      form.setValue(`initiatives.${rowIndex}.${field}`, value, {
        shouldDirty: true,
      });
      void form.trigger(`initiatives.${rowIndex}.${field}`);
    },
    [form, fieldArray]
  );

  return { form, fieldArray, handleCellChange };
};
