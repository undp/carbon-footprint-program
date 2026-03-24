import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const RejectReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const RejectReductionProjectBodySchema = z
  .object({
    reviewComments: z
      .string()
      .min(1)
      .describe("The reviewer comments explaining the rejection"),
  })
  .strict();

export const RejectReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
