import { z } from "zod";

const RankingSeveritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

const RankingItemSchema = z
  .object({
    rank: z
      .number()
      .int()
      .positive()
      .describe("The ranking position (1-based)"),
    name: z.string().describe("The subcategory name"),
    categoryName: z.string().describe("The category name"),
    categoryPosition: z
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
    severity: RankingSeveritySchema.describe(
      "Severity level based on percentage: HIGH for >= 25%, MEDIUM for >= 10%, LOW for the rest"
    ),
  })
  .strict();

export const GetSubcategoriesRankingResponseSchema = z
  .array(RankingItemSchema)
  .describe(
    "Subcategories ranked by descending emissions (own organization), using the standard competition ranking method"
  );
