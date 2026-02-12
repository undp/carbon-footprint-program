import { z } from "zod";
import {
  UpdateMethodologyParamsSchema,
  UpdateMethodologyRequestSchema,
  UpdateMethodologyResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type UpdateMethodologyParams = z.infer<
  typeof UpdateMethodologyParamsSchema
>;
export type UpdateMethodologyRequest = z.infer<
  typeof UpdateMethodologyRequestSchema
>;
export type UpdateMethodologyResponse = z.infer<
  typeof UpdateMethodologyResponseSchema
>;
