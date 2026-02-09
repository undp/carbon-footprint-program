import { z } from "zod";
import type {
  CreateMethodologyRequestSchema,
  CreateMethodologyResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type CreateMethodologyRequest = z.infer<
  typeof CreateMethodologyRequestSchema
>;
export type CreateMethodologyResponse = z.infer<
  typeof CreateMethodologyResponseSchema
>;
