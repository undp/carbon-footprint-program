import { useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MAGNITUDE_NAME_MAX_LENGTH,
  MAGNITUDE_CODE_MAX_LENGTH,
  MAGNITUDE_CODE_REGEX,
} from "@repo/constants";

const magnitudeFormRowSchema = z.object({
  id: z.string(),
  code: z
    .string()
    .trim()
    .min(1, { message: "El código es obligatorio." })
    .max(MAGNITUDE_CODE_MAX_LENGTH, {
      message: `El código no puede superar los ${MAGNITUDE_CODE_MAX_LENGTH} caracteres.`,
    })
    .regex(MAGNITUDE_CODE_REGEX, {
      message:
        "El código debe estar en minúsculas, comenzar con una letra y solo contener letras, números o guiones bajos (p. ej. vehicles).",
    }),
  name: z
    .string()
    .trim()
    .min(1, { message: "El nombre es obligatorio." })
    .max(MAGNITUDE_NAME_MAX_LENGTH, {
      message: `El nombre no puede superar los ${MAGNITUDE_NAME_MAX_LENGTH} caracteres.`,
    }),
  isSystem: z.boolean(),
  referenceCount: z.number(),
});

export type MagnitudesFormValues = {
  magnitudes: z.input<typeof magnitudeFormRowSchema>[];
};

export type MagnitudesFormRow = MagnitudesFormValues["magnitudes"][number];

export const useMagnitudesForm = (reservedCodes: Set<string>) => {
  const schema = useMemo(
    () =>
      z.object({
        magnitudes: z.array(magnitudeFormRowSchema).superRefine((rows, ctx) => {
          const tempCodeCounts = new Map<string, number>();
          rows.forEach((row) => {
            if (!row.id.startsWith("temp_")) return;
            const code = row.code.trim();
            if (!code) return;
            tempCodeCounts.set(code, (tempCodeCounts.get(code) ?? 0) + 1);
          });

          rows.forEach((row, index) => {
            if (!row.id.startsWith("temp_")) return;

            const code = row.code.trim();
            if (!code) return;

            if (reservedCodes.has(code)) {
              ctx.addIssue({
                code: "custom",
                message: "Ya existe una magnitud con este código.",
                path: [index, "code"],
              });
              return;
            }

            if ((tempCodeCounts.get(code) ?? 0) > 1) {
              ctx.addIssue({
                code: "custom",
                message: "Este código está duplicado en las filas nuevas.",
                path: [index, "code"],
              });
            }
          });
        }),
      }),
    [reservedCodes]
  );

  const form = useForm<MagnitudesFormValues>({
    defaultValues: { magnitudes: [] },
    mode: "onBlur",
    resolver: zodResolver(schema),
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "magnitudes",
  });

  const handleCellChange = useCallback(
    <K extends keyof MagnitudesFormRow>(
      rowIndex: number,
      field: K,
      value: MagnitudesFormRow[K]
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.setValue(`magnitudes.${rowIndex}.${field}` as any, value, {
        shouldDirty: true,
      });
      void form.trigger(`magnitudes.${rowIndex}.${field}`);
    },
    [form]
  );

  return { form, fieldArray, handleCellChange };
};
