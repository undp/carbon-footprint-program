import type { z } from "zod";
import type { GetMainActivityEquivalenceResponseSchema } from "./schemas.js";

export type GetMainActivityEquivalenceResponse = z.infer<
  typeof GetMainActivityEquivalenceResponseSchema
>;
