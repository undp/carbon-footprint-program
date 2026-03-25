import { z } from "zod";

import {
  SubcategoryBaseSchema,
  MeasurementUnitBaseSchema,
  CategoryBaseSchema,
} from "../../baseSchemas/index.js";
import { IconNameSchema } from "../../common/index.js";

export const CreateSubcategoryRequestSchema = z.strictObject({
  ...SubcategoryBaseSchema.pick({
    categoryId: true,
    name: true,
    icon: true,
    description: true,
  }).shape,
  examples: z
    .union([z.string().min(1), z.null(), z.literal("").transform(() => null)])
    .describe("Examples of the subcategory"),
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
  icon: IconNameSchema,
  description: z.string().trim().min(1, "Descripción es requerida"),
  examples: z
    .string()
    .trim()
    .nullable()
    .transform((v) => (v === "" ? null : v)),
  measurementUnitIds: z.array(MeasurementUnitBaseSchema.shape.id),
});

// Response Schema
export const CreateSubcategoryResponseSchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  description: true,
  examples: true,
}).extend({
  category: CategoryBaseSchema.pick({ id: true, name: true, color: true }),
  measurementUnits: z.array(
    MeasurementUnitBaseSchema.pick({ id: true, name: true })
  ),
});
