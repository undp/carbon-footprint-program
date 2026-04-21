import { z } from "zod";
import type {
  AdminInitiativeListItemSchema,
  GetAllInitiativesResponseSchema,
} from "./schemas.js";

export type AdminInitiativeListItem = z.infer<
  typeof AdminInitiativeListItemSchema
>;
export type GetAllInitiativesResponse = z.infer<
  typeof GetAllInitiativesResponseSchema
>;
