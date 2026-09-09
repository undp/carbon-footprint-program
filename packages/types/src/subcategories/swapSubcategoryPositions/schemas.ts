import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { SubcategoryBaseSchema } from "../../baseSchemas/index.js";

// Request Schema
export const SwapSubcategoryPositionsRequestSchema = z
  .object({
    subcategoryIdA: IdSchema.describe("The ID of the first subcategory"),
    subcategoryIdB: IdSchema.describe("The ID of the second subcategory"),
  })
  .strict();

// Response Schema
export const SwapSubcategoryPositionsResponseSchema = z
  .object({
    subcategories: z
      .tuple([SubcategoryBaseSchema, SubcategoryBaseSchema])
      .describe("Both updated subcategories after the swap"),
  })
  .strict();
