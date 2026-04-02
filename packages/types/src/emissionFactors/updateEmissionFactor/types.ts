import { z } from "zod";
import type {
  UpdateEmissionFactorParamsSchema,
  UpdateEmissionFactorRequestSchema,
  UpdateEmissionFactorResponseSchema,
} from "./schemas.js";

export type UpdateEmissionFactorParams = z.infer<
  typeof UpdateEmissionFactorParamsSchema
>;
export type UpdateEmissionFactorRequest = z.infer<
  typeof UpdateEmissionFactorRequestSchema
>;
export type UpdateEmissionFactorResponse = z.infer<
  typeof UpdateEmissionFactorResponseSchema
>;
