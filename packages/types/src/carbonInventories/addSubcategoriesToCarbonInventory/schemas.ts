import { z } from "zod";
import { SubcategoryBaseSchema } from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

export const AddSubcategoriesToCarbonInventoryBodySchema = z.object({
  subcategoryIds: z
    .array(SubcategoryBaseSchema.shape.id)
    .min(1)
    .describe("Array of subcategory IDs to add (as strings)"),
});

export const AddSubcategoriesToCarbonInventoryResponseSchema = z.object({
  added: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of subcategories that were added"),
  skipped: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Number of subcategories that were skipped because they already have ACTIVE lines"
    ),
});

export const AddSubcategoriesToCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});
