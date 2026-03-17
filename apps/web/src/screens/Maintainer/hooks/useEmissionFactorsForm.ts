import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type GetAllEmissionFactorsResponse,
  EmissionFactorFormSchema,
  type EmissionFactorForm,
} from "@repo/types";

type EmissionFactor = GetAllEmissionFactorsResponse[number];

const emissionFactorsFormSchema = z.object({
  emissionFactors: z.array(EmissionFactorFormSchema),
});

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

export const useEmissionFactorsForm = () => {
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
        const updatedRow = { ...structuredClone(currentRow), [field]: value };

        fieldArray.update(rowIndex, updatedRow);
        form.setValue(`emissionFactors.${rowIndex}.${field}`, value as never, {
          shouldDirty: true,
        });
        void form.trigger(`emissionFactors.${rowIndex}.${field}`);
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
