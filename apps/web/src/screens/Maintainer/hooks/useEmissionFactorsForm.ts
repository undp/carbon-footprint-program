import { useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type GetAllEmissionFactorsResponse,
  EmissionFactorFormSchema,
  type EmissionFactorForm,
} from "@repo/types";

type EmissionFactor = GetAllEmissionFactorsResponse[number];

export interface DimensionRequirements {
  var1Required: boolean;
  var2Required: boolean;
}

export interface EmissionFactorsFormValues {
  emissionFactors: EmissionFactorForm[];
}

const DEFAULT_GAS_DETAILS: EmissionFactorForm["gasDetails"] = {
  CO2_FOSSIL: 0,
  CH4: 0,
  N2O: 0,
  HFC: 0,
  PFC: 0,
  SF6: 0,
  NF3: 0,
};

/** Transform server response to form shape. */
export function toFormEmissionFactor(ef: EmissionFactor): EmissionFactorForm {
  return {
    id: ef.id,
    subcategoryId: ef.subcategoryId,
    dimensionValue1Name: ef.dimensionValue1Name,
    dimensionValue2Name: ef.dimensionValue2Name,
    rateMeasurementUnitId: ef.rateMeasurementUnitId,
    source: ef.source,
    value: Number(ef.value),
    gasDetails: ef.gasDetails ?? DEFAULT_GAS_DETAILS,
  };
}

export const useEmissionFactorsForm = (
  dimensionRequirements: Record<string, DimensionRequirements> = {}
) => {
  const emissionFactorsFormSchema = useMemo(
    () =>
      z.object({
        emissionFactors: z.array(
          EmissionFactorFormSchema.superRefine((row, ctx) => {
            const req = dimensionRequirements[row.subcategoryId];
            if (req?.var1Required && !row.dimensionValue1Name?.trim()) {
              ctx.addIssue({
                code: "custom",
                message: "Variable 1 es requerida",
                path: ["dimensionValue1Name"],
              });
            }
            if (req?.var2Required && !row.dimensionValue2Name?.trim()) {
              ctx.addIssue({
                code: "custom",
                message: "Variable 2 es requerida",
                path: ["dimensionValue2Name"],
              });
            }
          })
        ),
      }),
    [dimensionRequirements]
  );

  const form = useForm<EmissionFactorsFormValues>({
    defaultValues: { emissionFactors: [] },
    mode: "onBlur",
    resolver: zodResolver(emissionFactorsFormSchema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "emissionFactors",
  });

  const handleCellChange = useCallback(
    (rowIndex: number, field: keyof EmissionFactorForm, value: unknown) => {
      const currentRow = form.getValues(`emissionFactors.${rowIndex}`);
      if (currentRow) {
        const updatedRow = { ...currentRow, [field]: value };

        if (field === "subcategoryId") {
          updatedRow.dimensionValue1Name = null;
          updatedRow.dimensionValue2Name = null;
        }

        // Keep the field-array row in sync for consumers that depend on
        // useFieldArray's internal row state; the setValue calls below are
        // still needed to mark fields dirty and trigger validation.
        fieldArray.update(rowIndex, updatedRow);
        form.setValue(`emissionFactors.${rowIndex}.${field}`, value as never, {
          shouldDirty: true,
        });
        if (field === "subcategoryId") {
          form.setValue(
            `emissionFactors.${rowIndex}.dimensionValue1Name`,
            null,
            { shouldDirty: true }
          );
          form.setValue(
            `emissionFactors.${rowIndex}.dimensionValue2Name`,
            null,
            { shouldDirty: true }
          );
        }
        void form.trigger(`emissionFactors.${rowIndex}.${field}`);
        if (field === "subcategoryId") {
          void form.trigger(`emissionFactors.${rowIndex}.dimensionValue1Name`);
          void form.trigger(`emissionFactors.${rowIndex}.dimensionValue2Name`);
        }
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
