import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CategoryBaseSchema } from "../../baseSchemas/index.js";

// Request Schema
export const SwapCategoryPositionsRequestSchema = z
  .object({
    categoryIdA: IdSchema.describe("The ID of the first category"),
    categoryIdB: IdSchema.describe("The ID of the second category"),
  })
  .strict();

// Response Schema
export const SwapCategoryPositionsResponseSchema = z
  .object({
    categories: z
      .tuple([CategoryBaseSchema, CategoryBaseSchema])
      .describe("Both updated categories after the swap"),
  })
  .strict();
