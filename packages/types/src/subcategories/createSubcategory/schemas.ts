import { z } from "zod";

import {
  SubcategoryBaseSchema,
  MeasurementUnitBaseSchema,
  CategoryBaseSchema,
} from "../../baseSchemas/index.js";
import { IconNameFormSchema } from "../../common/index.js";

export const CreateSubcategoryRequestSchema = z.strictObject({
  ...SubcategoryBaseSchema.pick({
    categoryId: true,
    name: true,
    icon: true,
    description: true,
  }).shape,
  explanation: z
    .union([z.string().min(1), z.null(), z.literal("").transform(() => null)])
    .optional()
    .describe("Inline markdown explanation content, if any"),
  measurementUnitIds: z
    .array(MeasurementUnitBaseSchema.shape.id)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "measurementUnitIds must not contain duplicates",
    })
    .describe("Array of measurement unit IDs associated with the sub-category"),
});

// Form Schema
export const SubcategoryFormSchema = z.strictObject({
  id: z.string().min(1), // Override IdSchema to allow temp_ IDs for new rows
  categoryId: z.string().trim().min(1, "Categoría es requerida"),
  name: z
    .string()
    .trim()
    .min(1, "Nombre es requerido")
    .max(255, "Nombre no puede exceder 255 caracteres"),
  icon: IconNameFormSchema,
  description: z.string().trim().min(1, "Descripción es requerida"),
  explanation: z
    .string()
    .trim()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  // Not editable in the grid: it is server-assigned on create and changed only
  // through the swap endpoint. A row that has not been created yet carries 0,
  // hence min(0) here where the base schema requires min(1).
  position: z.number().int().min(0),
  measurementUnitIds: z.array(MeasurementUnitBaseSchema.shape.id),
});

// Response Schema
export const CreateSubcategoryResponseSchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  description: true,
  explanation: true,
  position: true,
}).extend({
  category: CategoryBaseSchema.pick({ id: true, name: true, color: true }),
  measurementUnits: z.array(
    MeasurementUnitBaseSchema.pick({ id: true, name: true })
  ),
});
