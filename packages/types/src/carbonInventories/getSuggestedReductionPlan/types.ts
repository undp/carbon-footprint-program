import type { z } from "zod";
import type { GetSuggestedReductionPlanResponseSchema } from "./schemas.js";

export type GetSuggestedReductionPlanResponse = z.infer<
  typeof GetSuggestedReductionPlanResponseSchema
>;
