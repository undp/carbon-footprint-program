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
  ReductionPlanInitiativeMutationDataSchema,
  type AdminReductionPlanInitiativeListItem,
  type ReductionPlanInitiativeMutationData,
} from "@repo/types";

export interface ReductionPlanInitiativeFormRow extends ReductionPlanInitiativeMutationData {
  id: string;
}

export interface ReductionPlanInitiativesFormValues {
  reductionPlanInitiatives: ReductionPlanInitiativeFormRow[];
}

const REQUIRED_MESSAGE = "Requerido";

const idField = z.string().min(1, REQUIRED_MESSAGE).pipe(IdSchema);

const ReductionPlanInitiativeRowSchema =
  ReductionPlanInitiativeMutationDataSchema.extend({
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
  });

const reductionPlanInitiativesFormSchema = z.object({
  reductionPlanInitiatives: z
    .array(ReductionPlanInitiativeRowSchema)
    .superRefine((rows, ctx) => {
      const seen = new Map<string, number>();
      rows.forEach((row, index) => {
        const trimmed = row.title.trim().toLowerCase();
        if (!row.subcategoryId || !trimmed) return;
        const key = `${row.subcategoryId}::${trimmed}`;
        if (seen.has(key)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "title"],
            message:
              "Ya existe una iniciativa con este título en esta sub-categoría",
          });
        } else {
          seen.set(key, index);
        }
      });
    }),
});

export function toFormReductionPlanInitiative(
  item: AdminReductionPlanInitiativeListItem
): ReductionPlanInitiativeFormRow {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    subcategoryId: item.subcategoryId,
  };
}

export const useReductionPlanInitiativesForm = () => {
  const form = useForm<ReductionPlanInitiativesFormValues>({
    defaultValues: { reductionPlanInitiatives: [] },
    mode: "onBlur",
    resolver: zodResolver(reductionPlanInitiativesFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "reductionPlanInitiatives",
    keyName: "_id",
  });

  const handleCellChange = useCallback(
    (
      rowIndex: number,
      field: keyof ReductionPlanInitiativeFormRow,
      value: string
    ) => {
      const currentRow = form.getValues(`reductionPlanInitiatives.${rowIndex}`);
      if (!currentRow) return;
      const updatedRow = { ...structuredClone(currentRow), [field]: value };
      fieldArray.update(rowIndex, updatedRow);
      form.setValue(`reductionPlanInitiatives.${rowIndex}.${field}`, value, {
        shouldDirty: true,
      });
      void form.trigger(`reductionPlanInitiatives.${rowIndex}.${field}`);
    },
    [form, fieldArray]
  );

  return { form, fieldArray, handleCellChange };
};
