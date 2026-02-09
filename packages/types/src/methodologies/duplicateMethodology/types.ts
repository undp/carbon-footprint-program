import { z } from "zod";
import type {
  DuplicateMethodologyParamsSchema,
  DuplicateMethodologyResponseSchema,
} from "./schemas.js";

// TypeScript Types
export type DuplicateMethodologyParams = z.infer<
  typeof DuplicateMethodologyParamsSchema
>;
export type DuplicateMethodologyResponse = z.infer<
  typeof DuplicateMethodologyResponseSchema
>;
