import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetSuggestedReductionPlanParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetSuggestedReductionPlanResponseSchema = z
  .object({
    summary: z.string(),
    items: z.array(z.string()),
  })
  .strict()
  .nullable()
  .describe("Null if no reduction plan is available");
