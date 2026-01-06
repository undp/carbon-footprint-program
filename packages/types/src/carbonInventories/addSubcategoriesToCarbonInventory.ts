import { z } from "zod";

export const AddSubcategoriesToCarbonInventoryBodySchema = z.object({
  subcategoryIds: z
    .array(z.string().regex(/^\d+$/))
    .min(1)
    .describe("Array of subcategory IDs to add (as strings)"),
});

export type AddSubcategoriesToCarbonInventoryBody = z.infer<
  typeof AddSubcategoriesToCarbonInventoryBodySchema
>;

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

export type AddSubcategoriesToCarbonInventoryResponse = z.infer<
  typeof AddSubcategoriesToCarbonInventoryResponseSchema
>;
