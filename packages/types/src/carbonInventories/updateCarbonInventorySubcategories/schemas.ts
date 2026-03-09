import { z } from "zod";
import { IdSchema } from "../../zod.js";

const SubcategoriesRequestItemSchema = z
  .object({
    id: IdSchema.describe("The ID of the subcategory"),
    selected: z
      .boolean()
      .describe("Whether the subcategory should be selected"),
  })
  .strict();

export const UpdateCarbonInventorySubcategoriesRequestSchema = z
  .array(SubcategoriesRequestItemSchema)
  .min(1)
  .refine(
    (data) => {
      const ids = data.map(({ id }) => id);
      const uniqueIds = new Set(ids);
      return ids.length === uniqueIds.size;
    },
    {
      message: "Duplicate subcategory IDs are not allowed",
    }
  );

export const UpdateCarbonInventorySubcategoriesResponseSchema = z.object({
  added: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of subcategories that were added"),
  removed: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of subcategories that were removed"),
  skipped: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Number of subcategories that were skipped (already in desired state)"
    ),
});

export const UpdateCarbonInventorySubcategoriesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});
