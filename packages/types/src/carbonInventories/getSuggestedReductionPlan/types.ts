import type { z } from "zod";
import type {
  GetSuggestedReductionPlanParamsSchema,
  GetSuggestedReductionPlanResponseSchema,
} from "./schemas.js";

export type GetSuggestedReductionPlanParams = z.infer<
  typeof GetSuggestedReductionPlanParamsSchema
>;

export type GetSuggestedReductionPlanResponse = z.infer<
  typeof GetSuggestedReductionPlanResponseSchema
>;
