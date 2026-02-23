import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategorySchema } from "../baseSchemas.js";

// Query Schema — methodologyVersionId is required
export const GetAllCategoriesQuerySchema = z
  .object({
    methodologyVersionId: IdSchema.describe(
      "The ID of the methodology version to get categories for"
    ),
  })
  .strict();

// Response Schema
export const GetAllCategoriesResponseSchema = z.array(CategorySchema);
