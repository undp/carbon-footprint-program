import type { z } from "zod";
import type {
  GetSuggestedReductionPlanParamsSchema,
  GetSuggestedReductionPlanQuerySchema,
  GetSuggestedReductionPlanResponseSchema,
} from "./schemas.js";

export type GetSuggestedReductionPlanParams = z.infer<
  typeof GetSuggestedReductionPlanParamsSchema
>;

export type GetSuggestedReductionPlanQuery = z.infer<
  typeof GetSuggestedReductionPlanQuerySchema
>;

export type GetSuggestedReductionPlanResponse = z.infer<
  typeof GetSuggestedReductionPlanResponseSchema
>;
