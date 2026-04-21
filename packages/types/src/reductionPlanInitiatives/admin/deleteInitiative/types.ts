import { z } from "zod";
import type {
  DeleteInitiativeParamsSchema,
  DeleteInitiativeResponseSchema,
} from "./schemas.js";

export type DeleteInitiativeParams = z.infer<
  typeof DeleteInitiativeParamsSchema
>;
export type DeleteInitiativeResponse = z.infer<
  typeof DeleteInitiativeResponseSchema
>;
