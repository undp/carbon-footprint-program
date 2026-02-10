import type { z } from "zod";
import { GetSuggestedReductionPlanResponseSchema } from "./schemas.js";

export type GetSuggestedReductionPlanResponse = z.infer<
  typeof GetSuggestedReductionPlanResponseSchema
>;
