import { z } from "zod";
import {
  MethodologySchema,
  SubCategorySchema,
  MeasurementUnitSchema,
} from "../../baseSchemas/index.js";
import { CategorySchema } from "../../categories/baseSchemas.js";

// Query Schema — methodologyVersionId is required
export const GetAllSubcategoriesQuerySchema = z.strictObject({
  methodologyVersionId: MethodologySchema.shape.id,
});

export const GetAllSubcategoriesResponseSchema = z.array(
  SubCategorySchema.pick({
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
  })
);
