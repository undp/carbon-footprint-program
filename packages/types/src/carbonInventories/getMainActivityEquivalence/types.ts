import type { z } from "zod";
import type {
  GetMainActivityEquivalenceParamsSchema,
  GetMainActivityEquivalenceResponseSchema,
} from "./schemas.js";

export type GetMainActivityEquivalenceParams = z.infer<
  typeof GetMainActivityEquivalenceParamsSchema
>;

export type GetMainActivityEquivalenceResponse = z.infer<
  typeof GetMainActivityEquivalenceResponseSchema
>;
