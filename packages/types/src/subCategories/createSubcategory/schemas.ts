import { z } from "zod";

import { SubCategorySchema } from "../../baseSchemas/subcategory.js";
import { MeasurementUnitSchema } from "../../baseSchemas/measurementUnit.js";
import { CategorySchema } from "../../categories/baseSchemas.js";

export const CreateSubcategoryRequestSchema = z.strictObject({
  ...SubCategorySchema.pick({
    categoryId: true,
    name: true,
    icon: true,
    description: true,
    examples: true,
  }).shape,
  measurementUnitIds: z
    .array(MeasurementUnitSchema.shape.id)
    .describe("Array of measurement unit IDs associated with the sub-category"),
});

// Response Schema
export const CreateSubcategoryResponseSchema = SubCategorySchema.pick({
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
