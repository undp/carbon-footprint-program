import { useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  type GetAllEmissionFactorsResponse,
  EmissionFactorFormSchema,
  type EmissionFactorForm,
} from "@repo/types";

/**
 * What the form reads off a server factor. Narrower than the listing row on
 * purpose: `referencedLineCount` is a read-only fact about the catalogue, not a
 * form field, and the create and update responses do not carry it — omitting it
 * here lets all three be mapped by the same function.
 */
type ServerEmissionFactor = Omit<
  GetAllEmissionFactorsResponse[number],
  "referencedLineCount"
>;

export interface DimensionRequirements {
  var1Required: boolean;
  var2Required: boolean;
}

/**
 * A row as the form holds it, before validation. It differs from
 * `EmissionFactorForm` only in the year, which is `null` until the admin
 * chooses one: a new row is born without it. Validation refuses the `null`,
 * so what reaches the API is always an `EmissionFactorForm`.
 */
export type EmissionFactorFormRow = z.input<typeof EmissionFactorFormSchema>;

export interface EmissionFactorsFormValues {
  emissionFactors: EmissionFactorFormRow[];
}

interface ValidatedEmissionFactorsFormValues {
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

/**
 * The row the grid prepends when the admin adds a factor. It is born without a
 * year: guessing the current one dated factors silently, and a factor dated to
 * the wrong year is offered to the wrong footprints. The schema refuses to save
 * it until the admin chooses one.
 */
export const createNewEmissionFactorRow = (
  id: string
): EmissionFactorFormRow => ({
  id,
  subcategoryId: "",
  dimensionValue1Name: null,
  dimensionValue2Name: null,
  rateMeasurementUnitId: "",
  source: "",
  year: null,
  value: 0,
  gasDetails: DEFAULT_GAS_DETAILS,
});

/** Transform server response to form shape. */
export function toFormEmissionFactor(
  ef: ServerEmissionFactor
): EmissionFactorForm {
  return {
    id: ef.id,
    subcategoryId: ef.subcategoryId,
    dimensionValue1Name: ef.dimensionValue1Name,
    dimensionValue2Name: ef.dimensionValue2Name,
    rateMeasurementUnitId: ef.rateMeasurementUnitId,
    source: ef.source,
    year: ef.year,
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

  const form = useForm<
    EmissionFactorsFormValues,
    unknown,
    ValidatedEmissionFactorsFormValues
  >({
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
