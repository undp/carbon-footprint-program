import { z } from "zod";

export const UpdateExplanationParamsSchema = z
  .object({
    slug: z.string().min(1),
  })
  .strict();

export const UpdateExplanationRequestSchema = z
  .object({
    content: z.string().max(1),
  })
  .strict();

export const UpdateExplanationResponseSchema = z.object({}).strict();
