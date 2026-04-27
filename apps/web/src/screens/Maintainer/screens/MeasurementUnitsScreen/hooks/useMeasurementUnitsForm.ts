import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreateMeasurementUnitBodySchema } from "@repo/types";
import type { MeasurementUnitForm } from "../types";

export interface MeasurementUnitsFormValues {
  measurementUnits: MeasurementUnitForm[];
}

const measurementUnitRowSchema = CreateMeasurementUnitBodySchema.extend({
  id: z.string(),
  referenceCount: z.number(),
});

const measurementUnitsFormSchema = z.object({
  measurementUnits: z.array(measurementUnitRowSchema),
});

export const useMeasurementUnitsForm = () => {
  const form = useForm<MeasurementUnitsFormValues>({
    defaultValues: { measurementUnits: [] },
    mode: "onBlur",
    resolver: zodResolver(measurementUnitsFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "measurementUnits",
  });

  const handleCellChange = useCallback(
    <K extends keyof MeasurementUnitForm>(
      rowIndex: number,
      field: K,
      value: MeasurementUnitForm[K]
    ) => {
      const currentRow = form.getValues(`measurementUnits.${rowIndex}`);
      if (!currentRow) return;
      const updatedRow = { ...structuredClone(currentRow), [field]: value };
      fieldArray.update(rowIndex, updatedRow);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue(`measurementUnits.${rowIndex}.${field}` as any, value, {
        shouldDirty: true,
      });
      void form.trigger(`measurementUnits.${rowIndex}.${field}`);
    },
    [form, fieldArray]
  );

  return { form, fieldArray, handleCellChange };
};
