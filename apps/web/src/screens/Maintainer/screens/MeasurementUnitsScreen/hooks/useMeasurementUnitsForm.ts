import { useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MEASUREMENT_UNIT_NAME_MAX_LENGTH,
  MEASUREMENT_UNIT_ABBREVIATION_MAX_LENGTH,
  ABBREVIATION_REGEX,
} from "@repo/constants";

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
  magnitudeId: z.string().min(1, { message: "La magnitud es obligatoria." }),
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

export type MeasurementUnitsFormValues = {
  measurementUnits: z.input<typeof measurementUnitFormRowSchema>[];
};

export type MeasurementUnitsFormRow =
  MeasurementUnitsFormValues["measurementUnits"][number];

export const useMeasurementUnitsForm = (
  magnitudesWithBaseUnit: Set<string>
) => {
  const schema = useMemo(() => {
    const rowSchema = measurementUnitFormRowSchema.superRefine((row, ctx) => {
      if (row.isBase && row.baseFactor !== null && row.baseFactor !== 1) {
        ctx.addIssue({
          code: "custom",
          message: "Una unidad base debe tener factor base igual a 1.",
          path: ["baseFactor"],
        });
      }

      if (
        !row.isBase &&
        row.baseFactor === 1 &&
        magnitudesWithBaseUnit.has(row.magnitudeId)
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "No se puede asignar factor base 1 cuando ya existe una unidad base para esta magnitud.",
          path: ["baseFactor"],
        });
      }
    });

    return z.object({
      measurementUnits: z.array(rowSchema).superRefine((rows, ctx) => {
        rows.forEach((row, index) => {
          if (!row.isBase) return;

          const conflictsWithAnotherRow = rows.some(
            (other, otherIndex) =>
              otherIndex !== index &&
              other.isBase &&
              other.magnitudeId === row.magnitudeId
          );

          if (conflictsWithAnotherRow) {
            ctx.addIssue({
              code: "custom",
              message: "Solo puede existir una unidad base por magnitud.",
              path: [index, "isBase"],
            });
          }
        });
      }),
    });
  }, [magnitudesWithBaseUnit]);

  const form = useForm<MeasurementUnitsFormValues>({
    defaultValues: { measurementUnits: [] },
    mode: "onBlur",
    resolver: zodResolver(schema),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue(`measurementUnits.${rowIndex}.${field}` as any, value, {
        shouldDirty: true,
      });
      void form.trigger(`measurementUnits.${rowIndex}.${field}`);
    },
    [form]
  );

  return { form, fieldArray, handleCellChange };
};
