import { z } from "zod";

export const GetSuggestedReductionPlanResponseSchema = z
  .object({
    summary: z.string(),
    items: z.array(z.string()),
  })
  .strict()
  .nullable()
  .describe("Null if no reduction plan is available");
