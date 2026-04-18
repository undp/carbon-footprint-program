import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetSuggestedReductionPlanParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetSuggestedReductionPlanQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, "Limit must be a positive integer")
    .refine((v) => parseInt(v, 10) >= 1, {
      message: "Limit must be greater than or equal to 1",
    })
    .optional()
    .describe(
      "Maximum number of initiatives to return. Defaults to 5 when omitted."
    ),
});

export const GetSuggestedReductionPlanResponseSchema = z.array(
  z
    .object({
      id: IdSchema,
      title: z.string(),
      description: z.string(),
    })
    .strict()
);
