import { z } from "zod";
import { IdSchema } from "../../zod.js";

const CategoryResultSchema = z
  .object({
    id: IdSchema.describe("The category ID"),
    name: z.string().describe("The category name"),
    synonyms: z.string().nullable().describe("Category synonyms"),
    position: z
      .number()
      .int()
      .positive()
      .describe("The category position (1, 2, 3...)"),
    subtotal: z
      .number()
      .nonnegative()
      .describe("The subtotal emissions in tCO2e, rounded to 2 decimal places"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe(
        "The percentage as a 3-decimal float between 0 and 1, relative to total emissions"
      ),
  })
  .strict();

export const GetEmissionsSummaryCategoriesResponseSchema = z
  .object({
    carbonInventory: z
      .object({
        id: IdSchema,
        name: z.string().nullable(),
      })
      .strict(),
    totalEmissions: z
      .number()
      .nonnegative()
      .describe("Total emissions in tCO2e, rounded to 2 decimal places"),
    categories: z
      .array(CategoryResultSchema)
      .describe(
        "All methodology categories with subtotals and percentages, ordered by position"
      ),
  })
  .strict();
