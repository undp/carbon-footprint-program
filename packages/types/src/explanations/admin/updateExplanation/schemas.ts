import { z } from "zod";
import { ExplanationBaseSchema } from "../../../baseSchemas/index.js";

export const EXPLANATION_CONTENT_MAX_LENGTH = 10000;

export const UpdateExplanationParamsSchema = z
  .object({
    slug: z.string().min(1),
  })
  .strict();

export const UpdateExplanationRequestSchema = z
  .object({
    content: z.string().max(EXPLANATION_CONTENT_MAX_LENGTH),
  })
  .strict();

export const UpdateExplanationResponseSchema = ExplanationBaseSchema;
