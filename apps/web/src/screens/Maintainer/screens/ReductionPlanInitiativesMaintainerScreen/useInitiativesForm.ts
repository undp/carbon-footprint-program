import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH,
  REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH,
} from "@repo/constants";
import {
  IdSchema,
  InitiativeMutationDataSchema,
  type AdminInitiativeListItem,
  type InitiativeMutationData,
} from "@repo/types";

export interface InitiativeFormRow extends InitiativeMutationData {
  id: string;
  /** UI-only — filters subcategory selector, never sent to API. */
  categoryId: string;
}

export interface InitiativesFormValues {
  initiatives: InitiativeFormRow[];
}

const REQUIRED_MESSAGE = "Requerido";

const idField = z.string().min(1, REQUIRED_MESSAGE).pipe(IdSchema);

const InitiativeRowSchema = InitiativeMutationDataSchema.extend({
  id: z.string(),
  title: z
    .string()
    .trim()
    .min(1, REQUIRED_MESSAGE)
    .max(
      REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH,
      `Máximo ${REDUCTION_PLAN_INITIATIVE_TITLE_MAX_LENGTH} caracteres`
    ),
  description: z
    .string()
    .trim()
    .min(1, REQUIRED_MESSAGE)
    .max(
      REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH,
      `Máximo ${REDUCTION_PLAN_INITIATIVE_DESCRIPTION_MAX_LENGTH} caracteres`
    ),
  subcategoryId: idField,
  categoryId: idField,
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
    keyName: "_id",
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
