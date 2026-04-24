import { z } from "zod";
import type {
  AdminReductionPlanInitiativeListItemSchema,
  GetAllReductionPlanInitiativesResponseSchema,
} from "./schemas.js";

export type AdminReductionPlanInitiativeListItem = z.infer<
  typeof AdminReductionPlanInitiativeListItemSchema
>;
export type GetAllReductionPlanInitiativesResponse = z.infer<
  typeof GetAllReductionPlanInitiativesResponseSchema
>;
