import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubcategoryBaseSchema } from "../../baseSchemas/index.js";

export const GetAllSubcategoriesQuerySchema = z
  .object({
    methodologyVersionId: IdSchema.optional().describe(
      "The ID of the methodology version. When omitted, uses the currently PUBLISHED methodology."
    ),
  })
  .strict();

export const GetAllSubcategoriesResponseSchema = z.array(SubcategoryBaseSchema);
