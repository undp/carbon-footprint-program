import { z } from "zod";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const RejectReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
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
