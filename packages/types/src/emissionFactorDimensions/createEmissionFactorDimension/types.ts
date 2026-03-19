import { z } from "zod";
import type {
  CreateEmissionFactorDimensionRequestSchema,
  CreateEmissionFactorDimensionResponseSchema,
} from "./schemas.js";

export type CreateEmissionFactorDimensionRequest = z.infer<
  typeof CreateEmissionFactorDimensionRequestSchema
>;
export type CreateEmissionFactorDimensionResponse = z.infer<
  typeof CreateEmissionFactorDimensionResponseSchema
>;
