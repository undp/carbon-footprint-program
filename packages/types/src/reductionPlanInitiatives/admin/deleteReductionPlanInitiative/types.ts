import { z } from "zod";
import type {
  DeleteReductionPlanInitiativeParamsSchema,
  DeleteReductionPlanInitiativeResponseSchema,
} from "./schemas.js";

export type DeleteReductionPlanInitiativeParams = z.infer<
  typeof DeleteReductionPlanInitiativeParamsSchema
>;
export type DeleteReductionPlanInitiativeResponse = z.infer<
  typeof DeleteReductionPlanInitiativeResponseSchema
>;
