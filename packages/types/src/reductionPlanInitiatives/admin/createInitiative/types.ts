import { z } from "zod";
import type {
  CreateInitiativeRequestSchema,
  CreateInitiativeResponseSchema,
} from "./schemas.js";

export type CreateInitiativeRequest = z.infer<
  typeof CreateInitiativeRequestSchema
>;
export type CreateInitiativeResponse = z.infer<
  typeof CreateInitiativeResponseSchema
>;
