import { z } from "zod";
import type {
  CreateMagnitudeBodySchema,
  CreateMagnitudeResponseSchema,
} from "./schemas.js";

export type CreateMagnitudeBody = z.infer<typeof CreateMagnitudeBodySchema>;
export type CreateMagnitudeResponse = z.infer<
  typeof CreateMagnitudeResponseSchema
>;
