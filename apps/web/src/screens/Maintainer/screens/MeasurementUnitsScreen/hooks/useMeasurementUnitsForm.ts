import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MEASUREMENT_UNIT_NAME_MAX_LENGTH,
  MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH,
  ABBREVIATION_REGEX,
} from "@repo/constants";
import { Magnitude } from "@repo/types";

const measurementUnitFormRowSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio." })
    .max(MEASUREMENT_UNIT_NAME_MAX_LENGTH, {
      message: `El nombre no puede superar ${MEASUREMENT_UNIT_NAME_MAX_LENGTH} caracteres.`,
    }),
  abbreviation: z
    .string()
    .trim()
    .min(1, { message: "La abreviatura es obligatoria." })
    .max(MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH, {
      message: `La abreviatura no puede superar ${MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH} caracteres.`,
    })
    .regex(ABBREVIATION_REGEX, {
      message:
        "La abreviatura no puede contener barras (/) ni caracteres de control.",
    }),
  magnitude: z.enum(Magnitude, {
    message: "La magnitud seleccionada no es válida.",
  }),
  baseFactor: z
    .number({
      error: "El factor base debe ser un número válido.",
    })
    .positive({ message: "El factor base debe ser mayor que cero." })
    .nullable()
    .refine((v) => v !== null, {
      message: "El factor base es obligatorio.",
    }),
  isBase: z.boolean(),
  referenceCount: z.number(),
});

const measurementUnitsFormSchema = z.object({
  measurementUnits: z.array(measurementUnitFormRowSchema),
});

export type MeasurementUnitsFormValues = z.input<
  typeof measurementUnitsFormSchema
>;

export type MeasurementUnitsFormRow =
  MeasurementUnitsFormValues["measurementUnits"][number];

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
    <K extends keyof MeasurementUnitsFormRow>(
      rowIndex: number,
      field: K,
      value: MeasurementUnitsFormRow[K]
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
