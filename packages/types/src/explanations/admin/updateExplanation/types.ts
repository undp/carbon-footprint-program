import { z } from "zod";
import type {
  UpdateExplanationParamsSchema,
  UpdateExplanationRequestSchema,
  UpdateExplanationResponseSchema,
} from "./schemas.ts";

export type UpdateExplanationParams = z.infer<
  typeof UpdateExplanationParamsSchema
>;

export type UpdateExplanationRequest = z.infer<
  typeof UpdateExplanationRequestSchema
>;

export type UpdateExplanationResponse = z.infer<
  typeof UpdateExplanationResponseSchema
>;
