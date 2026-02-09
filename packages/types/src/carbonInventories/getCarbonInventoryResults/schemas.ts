import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const RankingSeveritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

const SubcategoryResultSchema = z
  .object({
    id: IdSchema.describe("The subcategory ID"),
    name: z.string().describe("The subcategory name"),
    subtotal: z.number().nonnegative().describe("The subtotal emissions in tCO2e"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe(
        "The percentage as a 4-decimal float between 0 and 1, relative to category subtotal"
      ),
  })
  .strict();

const CategoryResultSchema = z
  .object({
    id: IdSchema.describe("The category ID"),
    name: z.string().describe("The category name"),
    synonyms: z.string().nullable().describe("Category synonyms"),
    position: z.number().int().positive().describe("The category position (1, 2, 3...)"),
    subtotal: z.number().nonnegative().describe("The subtotal emissions in tCO2e"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe(
        "The percentage as a 4-decimal float between 0 and 1, relative to total emissions"
      ),
    subcategories: z
      .array(SubcategoryResultSchema)
      .describe("The subcategory results within this category"),
  })
  .strict();

const RankingItemSchema = z
  .object({
    position: z.number().int().positive().describe("The ranking position (1-based)"),
    name: z.string().describe("The subcategory name"),
    categoryId: IdSchema.describe("The category ID"),
    subtotal: z.number().nonnegative().describe("The subtotal emissions in tCO2e"),
    percentage: z
      .number()
      .min(0)
      .max(1)
      .describe(
        "The percentage as a 4-decimal float between 0 and 1, relative to total emissions"
      ),
    severity: RankingSeveritySchema.describe(
      "Severity level: HIGH for position 1, MEDIUM for positions 2-4, LOW for the rest"
    ),
  })
  .strict();

export const GetCarbonInventoryResultsResponseSchema = z
  .object({
    carbonInventory: z
      .object({
        id: IdSchema,
        name: z.string().nullable(),
      })
      .strict(),
    totalEmissions: z.number().nonnegative().describe("Total emissions in tCO2e"),
    categories: z
      .array(CategoryResultSchema)
      .describe(
        "All methodology categories with subtotals and percentages, ordered by position"
      ),
    suggestedReductionPlan: z
      .object({
        summary: z.string(),
        items: z.array(z.string()),
      })
      .strict()
      .nullable()
      .describe("Null if no reduction plan is available"),
    subcategoriesRanking: z
      .object({
        own: z
          .array(RankingItemSchema)
          .describe(
            "Subcategories ranked by descending emissions (own organization)"
          ),
        sector: z
          .array(RankingItemSchema)
          .describe(
            "Subcategories ranked by descending emissions (sector comparison)"
          ),
      })
      .strict(),
    mainActivityEquivalence: z
      .object({
        rate: z.number().nonnegative().describe("Emissions per main activity unit"),
        activityName: z.string().describe("The name of the main activity"),
      })
      .strict()
      .nullable()
      .describe("Null if mainActivityQuantity is not defined"),
  })
  .strict();
