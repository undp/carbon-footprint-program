import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubCategoryWithUnitsSchema } from "../baseSchemas.js";

// Query Schema — methodologyVersionId is required
export const GetAllSubcategoriesQuerySchema = z
  .object({
    methodologyVersionId: IdSchema.describe(
      "The ID of the methodology version to get subcategories for"
    ),
  })
  .strict();

// Response Schema
export const GetAllSubcategoriesResponseSchema = z.array(
  SubCategoryWithUnitsSchema
);
