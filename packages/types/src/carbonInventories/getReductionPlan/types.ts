import type { z } from "zod";
import type {
  GetReductionPlanParamsSchema,
  GetReductionPlanResponseSchema,
} from "./schemas.js";

export type GetReductionPlanParams = z.infer<
  typeof GetReductionPlanParamsSchema
>;

export type GetReductionPlanResponse = z.infer<
  typeof GetReductionPlanResponseSchema
>;
