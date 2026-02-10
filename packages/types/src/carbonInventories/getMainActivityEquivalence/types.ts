import type { z } from "zod";
import { GetMainActivityEquivalenceResponseSchema } from "./schemas.js";

export type GetMainActivityEquivalenceResponse = z.infer<
  typeof GetMainActivityEquivalenceResponseSchema
>;
