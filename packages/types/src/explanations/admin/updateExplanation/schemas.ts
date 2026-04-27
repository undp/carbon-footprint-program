import { z } from "zod";
import { EXPLANATION_CONTENT_MAX_LENGTH } from "@repo/constants";

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
