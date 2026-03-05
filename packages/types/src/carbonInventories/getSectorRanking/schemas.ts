import { z } from "zod";
import { SubcategoryBaseSchema } from "../../baseSchemas/subcategory.js";
import { CategoryBaseSchema } from "../../baseSchemas/category.js";

export const RankingSeveritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);

export const RankingItemSchema = z
  .object({
    rank: z
      .number()
      .int()
      .positive()
      .describe("The ranking position (1-based)"),
    name: SubcategoryBaseSchema.shape.name,
    categoryName: CategoryBaseSchema.shape.name,
    categoryPosition: CategoryBaseSchema.shape.position,
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

export const GetSectorRankingResponseSchema = z
  .array(RankingItemSchema)
  .describe(
    "Subcategories ranked by descending emissions (sector comparison), using the standard competition ranking method"
  );
