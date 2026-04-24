import { z } from "zod";
import type {
  CreateReductionPlanInitiativeRequestSchema,
  CreateReductionPlanInitiativeResponseSchema,
} from "./schemas.js";

export type CreateReductionPlanInitiativeRequest = z.infer<
  typeof CreateReductionPlanInitiativeRequestSchema
>;
export type CreateReductionPlanInitiativeResponse = z.infer<
  typeof CreateReductionPlanInitiativeResponseSchema
>;
