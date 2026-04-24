import { z } from "zod";
import {
  SubcategoryBaseSchema,
  CategoryBaseSchema,
  MeasurementUnitBaseSchema,
} from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

// Query Schema — methodologyVersionId is optional; when omitted, all active
// subcategories across methodologies are returned (used by the subcategory
// recommendations maintainer, which is not methodology-scoped).
export const GetAllSubcategoriesQuerySchema = z.strictObject({
  methodologyVersionId: IdSchema.optional().describe(
    "The ID of the methodology version to filter subcategories by"
  ),
});

export const GetAllSubcategoriesResponseSchema = z.array(
  SubcategoryBaseSchema.pick({
    id: true,
    name: true,
    icon: true,
    description: true,
    explanation: true,
  }).extend({
    category: CategoryBaseSchema.pick({ id: true, name: true, color: true }),
    measurementUnits: z.array(
      MeasurementUnitBaseSchema.pick({ id: true, name: true })
    ),
  })
);
