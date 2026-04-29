import { z } from "zod";
import type {
  AdminReductionPlanInitiativeListItemSchema,
  GetAllReductionPlanInitiativesResponseSchema,
  GetAllReductionPlanInitiativesQuerySchema,
} from "./schemas.js";

export type AdminReductionPlanInitiativeListItem = z.infer<
  typeof AdminReductionPlanInitiativeListItemSchema
>;
export type GetAllReductionPlanInitiativesResponse = z.infer<
  typeof GetAllReductionPlanInitiativesResponseSchema
>;
export type GetAllReductionPlanInitiativesQuery = z.infer<
  typeof GetAllReductionPlanInitiativesQuerySchema
>;
