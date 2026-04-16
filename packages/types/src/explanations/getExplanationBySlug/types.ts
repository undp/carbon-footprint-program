import { z } from "zod";
import type {
  GetExplanationBySlugParamsSchema,
  GetExplanationBySlugResponseSchema,
} from "./schemas.ts";

export type GetExplanationBySlugParams = z.infer<
  typeof GetExplanationBySlugParamsSchema
>;

export type GetExplanationBySlugResponse = z.infer<
  typeof GetExplanationBySlugResponseSchema
>;
