import { z } from "zod";
import type {
  UpdateExplanationParamsSchema,
  UpdateExplanationRequestSchema,
} from "./schemas.ts";

export type UpdateExplanationParams = z.infer<
  typeof UpdateExplanationParamsSchema
>;

export type UpdateExplanationRequest = z.infer<
  typeof UpdateExplanationRequestSchema
>;
