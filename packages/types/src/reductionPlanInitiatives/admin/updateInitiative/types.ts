import { z } from "zod";
import type {
  UpdateInitiativeParamsSchema,
  UpdateInitiativeRequestSchema,
  UpdateInitiativeResponseSchema,
} from "./schemas.js";

export type UpdateInitiativeParams = z.infer<
  typeof UpdateInitiativeParamsSchema
>;
export type UpdateInitiativeRequest = z.infer<
  typeof UpdateInitiativeRequestSchema
>;
export type UpdateInitiativeResponse = z.infer<
  typeof UpdateInitiativeResponseSchema
>;
