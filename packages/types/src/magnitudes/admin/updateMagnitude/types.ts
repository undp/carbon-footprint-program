import { z } from "zod";
import type {
  UpdateMagnitudeParamsSchema,
  UpdateMagnitudeBodySchema,
  UpdateMagnitudeResponseSchema,
} from "./schemas.js";

export type UpdateMagnitudeParams = z.infer<typeof UpdateMagnitudeParamsSchema>;
export type UpdateMagnitudeBody = z.infer<typeof UpdateMagnitudeBodySchema>;
export type UpdateMagnitudeResponse = z.infer<
  typeof UpdateMagnitudeResponseSchema
>;
