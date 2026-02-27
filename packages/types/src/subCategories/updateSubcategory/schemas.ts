import { z } from "zod";
import { IdSchema } from "../../zod.js";

import {
  SubCategorySchema,
  MeasurementUnitSchema,
} from "../../baseSchemas/index.js";
import { CategorySchema } from "../../categories/baseSchemas.js";

// Params Schema
export const UpdateSubcategoryParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the sub-category to update"),
  })
  .strict();

// Request Schema — all fields optional for partial updates, but at least one must be provided
export const UpdateSubcategoryRequestSchema = SubCategorySchema.pick({
  name: true,
  icon: true,
  description: true,
  examples: true,
})
  .extend({
    measurementUnitIds: z.array(MeasurementUnitSchema.shape.id),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

// Response Schema
export const UpdateSubcategoryResponseSchema = SubCategorySchema.pick({
  id: true,
  name: true,
  icon: true,
  description: true,
  examples: true,
}).extend({
  category: CategorySchema.pick({ id: true, name: true }),
  measurementUnits: z.array(
    MeasurementUnitSchema.pick({ id: true, name: true })
  ),
});
