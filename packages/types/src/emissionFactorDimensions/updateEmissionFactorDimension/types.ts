import { z } from "zod";
import type {
  UpdateEmissionFactorDimensionParamsSchema,
  UpdateEmissionFactorDimensionRequestSchema,
  UpdateEmissionFactorDimensionResponseSchema,
} from "./schemas.js";

export type UpdateEmissionFactorDimensionParams = z.infer<
  typeof UpdateEmissionFactorDimensionParamsSchema
>;
export type UpdateEmissionFactorDimensionRequest = z.infer<
  typeof UpdateEmissionFactorDimensionRequestSchema
>;
export type UpdateEmissionFactorDimensionResponse = z.infer<
  typeof UpdateEmissionFactorDimensionResponseSchema
>;
