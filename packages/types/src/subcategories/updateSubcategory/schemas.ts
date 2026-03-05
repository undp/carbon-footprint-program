import { z } from "zod";
import { IdSchema } from "../../zod.js";

import {
  SubcategoryBaseSchema,
  MeasurementUnitBaseSchema,
  CategoryBaseSchema,
} from "../../baseSchemas/index.js";

// Params Schema
export const UpdateSubcategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the sub-category to update"),
  })
  .strict();

// Request Schema — all fields optional for partial updates, but at least one must be provided
export const UpdateSubcategoryRequestSchema = SubcategoryBaseSchema.pick({
  categoryId: true,
  name: true,
  icon: true,
  description: true,
  examples: true,
})
  .extend({
    measurementUnitIds: z.array(MeasurementUnitBaseSchema.shape.id),
  })
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field must be provided with a defined value",
  });

// Response Schema
export const UpdateSubcategoryResponseSchema = SubcategoryBaseSchema.pick({
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
