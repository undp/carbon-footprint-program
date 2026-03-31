import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { GetEmissionFactorDimensionsResponse } from "@repo/types";

const DimensionVariableSchema = z.object({
  id: z.string(),
  value: z.string().trim().min(1, "Variable es requerida"),
  inUse: z.boolean().optional(),
});

const DimensionFormSchema = z.object({
  id: z.string(),
  subcategoryId: z.string().min(1, "Subcategoría es requerida"),
  subcategoryName: z.string(),
  name: z.string().trim().min(1, "Nombre es requerido"),
  position: z.number().int().min(1).max(2),
  isRequired: z.boolean(),
  subcategoryHasEmissionFactors: z.boolean().optional(),
  variables: z
    .array(DimensionVariableSchema)
    .min(1, "Debe tener al menos una variable"),
});

export type DimensionFormRow = z.infer<typeof DimensionFormSchema>;
export type DimensionVariable = z.infer<typeof DimensionVariableSchema>;

export interface DimensionsFormValues {
  dimensions: DimensionFormRow[];
}

const dimensionsFormSchema = z.object({
  dimensions: z.array(DimensionFormSchema),
});

/** Flatten the API response (grouped by subcategory) into one row per dimension. */
export function flattenDimensions(
  apiData: GetEmissionFactorDimensionsResponse
): DimensionFormRow[] {
  const rows: DimensionFormRow[] = [];
  for (const subcat of apiData) {
    for (const dim of subcat.dimensions) {
      rows.push({
        id: dim.id,
        subcategoryId: subcat.subcategoryId,
        subcategoryName: subcat.subcategoryName,
        name: dim.name,
        position: dim.position,
        isRequired: dim.isRequired,
        subcategoryHasEmissionFactors: subcat.subcategoryHasEmissionFactors,
        variables: dim.values.map((v) => ({
          id: v.id,
          value: v.value,
          inUse: v.inUse,
        })),
      });
    }
  }
  rows.sort((a, b) => {
    if (a.subcategoryId !== b.subcategoryId)
      return a.subcategoryId.localeCompare(b.subcategoryId);
    return a.position - b.position;
  });
  return rows;
}

export const useDimensionsForm = () => {
  const form = useForm<DimensionsFormValues>({
    defaultValues: { dimensions: [] },
    mode: "onBlur",
    resolver: zodResolver(dimensionsFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "dimensions",
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof DimensionFormRow, value: unknown) => {
      const currentRow = form.getValues(`dimensions.${rowIndex}`);
      if (currentRow) {
        const updatedRow = {
          ...structuredClone(currentRow),
          [field]: value,
        };
        fieldArray.update(rowIndex, updatedRow);
        form.setValue(`dimensions.${rowIndex}.${field}`, value as never, {
          shouldDirty: true,
        });
        void form.trigger(`dimensions.${rowIndex}.${field}`);
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
