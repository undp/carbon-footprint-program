import { z } from "zod";

import {
  SubcategoryBaseSchema,
  MeasurementUnitBaseSchema,
  CategoryBaseSchema,
} from "../../baseSchemas/index.js";

export const CreateSubcategoryRequestSchema = z.strictObject({
  ...SubcategoryBaseSchema.pick({
    categoryId: true,
    name: true,
    icon: true,
    description: true,
    examples: true,
  }).shape,
  measurementUnitIds: z
    .array(MeasurementUnitBaseSchema.shape.id)
    .describe("Array of measurement unit IDs associated with the sub-category"),
});

// Response Schema
export const CreateSubcategoryResponseSchema = SubcategoryBaseSchema.pick({
  id: true,
  name: true,
  icon: true,
  description: true,
  examples: true,
}).extend({
  category: CategoryBaseSchema.pick({ id: true, name: true }),
  measurementUnits: z.array(
    MeasurementUnitBaseSchema.pick({ id: true, name: true })
  ),
});
