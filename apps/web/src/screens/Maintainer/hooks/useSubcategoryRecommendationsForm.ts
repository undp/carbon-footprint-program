import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SubcategoryRecommendationGroup } from "@repo/types";

export interface SubcategoryRecommendationFormRow {
  id: string;
  sectorId: number | null;
  subsectorId: number | null;
  sectorName: string;
  subsectorName: string | null;
  subcategoryIds: number[];
}

export interface SubcategoryRecommendationFormValues {
  rows: SubcategoryRecommendationFormRow[];
}

const rowSchema = z.object({
  id: z.string(),
  sectorId: z.number().int().positive().nullable(),
  subsectorId: z.number().int().positive().nullable(),
  sectorName: z.string(),
  subsectorName: z.string().nullable(),
  subcategoryIds: z.array(z.number().int().positive()),
});

const formSchema = z.object({
  rows: z.array(rowSchema),
});

export const toFormRow = (
  group: SubcategoryRecommendationGroup
): SubcategoryRecommendationFormRow => ({
  id: `${group.sectorId}-${group.subsectorId ?? "null"}`,
  sectorId: group.sectorId,
  subsectorId: group.subsectorId,
  sectorName: group.sectorName,
  subsectorName: group.subsectorName,
  subcategoryIds: group.subcategoryIds,
});

export const isNewRow = (rowId: string): boolean => rowId.startsWith("temp-");

export const useSubcategoryRecommendationsForm = () => {
  const form = useForm<SubcategoryRecommendationFormValues>({
    defaultValues: { rows: [] },
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "rows",
  });

  const handleCellChange = useCallback(
    <K extends keyof SubcategoryRecommendationFormRow>(
      rowIndex: number,
      field: K,
      value: SubcategoryRecommendationFormRow[K]
    ) => {
      form.setValue(
        `rows.${rowIndex}.${field}` as Parameters<typeof form.setValue>[0],
        value as never,
        { shouldDirty: true, shouldValidate: true }
      );
    },
    [form]
  );

  return { form, fieldArray, handleCellChange };
};
