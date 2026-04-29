import { z } from "zod";
import type {
  UpdateReductionPlanInitiativeParamsSchema,
  UpdateReductionPlanInitiativeRequestSchema,
  UpdateReductionPlanInitiativeResponseSchema,
} from "./schemas.js";

export type UpdateReductionPlanInitiativeParams = z.infer<
  typeof UpdateReductionPlanInitiativeParamsSchema
>;
export type UpdateReductionPlanInitiativeRequest = z.infer<
  typeof UpdateReductionPlanInitiativeRequestSchema
>;
export type UpdateReductionPlanInitiativeResponse = z.infer<
  typeof UpdateReductionPlanInitiativeResponseSchema
>;
