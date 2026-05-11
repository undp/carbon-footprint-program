import { useCallback } from "react";
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

const magnitudesFormSchema = z.object({
  magnitudes: z.array(magnitudeFormRowSchema),
});

export type MagnitudesFormValues = {
  magnitudes: z.input<typeof magnitudeFormRowSchema>[];
};

export type MagnitudesFormRow = MagnitudesFormValues["magnitudes"][number];

export const useMagnitudesForm = () => {
  const form = useForm<MagnitudesFormValues>({
    defaultValues: { magnitudes: [] },
    mode: "onBlur",
    resolver: zodResolver(magnitudesFormSchema),
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
