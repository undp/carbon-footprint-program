import { z } from "zod";
import { CategoryBaseSchema } from "../../baseSchemas/category.js";
import { CarbonInventoryBaseSchema } from "../../baseSchemas/carbonInventory.js";
import { IdSchema } from "../../zod.js";
import { CarbonInventoryDisplayStatusSchema } from "../schemas.js";

export const GetEmissionsSummaryCategoriesParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

const CategoryItemSchema = CategoryBaseSchema.pick({
  id: true,
  name: true,
  synonyms: true,
  position: true,
  icon: true,
  color: true,
})
  .extend({
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
    carbonInventory: CarbonInventoryBaseSchema.pick({
      id: true,
      name: true,
      organizationId: true,
    })
      .strict()
      .extend({
        status: CarbonInventoryDisplayStatusSchema.describe(
          "The display status of the carbon inventory, based on the submissions"
        ),
      }),
    totalEmissions: z
      .number()
      .nonnegative()
      .describe("Total emissions in tCO2e, rounded to 2 decimal places"),
    categories: z
      .array(CategoryItemSchema)
      .describe(
        "All methodology categories with subtotals and percentages, ordered by position"
      ),
  })
  .strict();
