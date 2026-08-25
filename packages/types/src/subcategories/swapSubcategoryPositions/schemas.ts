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

// Response Schema — only the fields the caller needs to re-order its rows;
// the full subcategory shape is served by GET /subcategories.
const SwappedSubcategorySchema = SubcategoryBaseSchema.pick({
  id: true,
  categoryId: true,
  name: true,
  position: true,
});

export const SwapSubcategoryPositionsResponseSchema = z
  .object({
    subcategories: z
      .tuple([SwappedSubcategorySchema, SwappedSubcategorySchema])
      .describe("Both updated subcategories after the swap"),
  })
  .strict();
