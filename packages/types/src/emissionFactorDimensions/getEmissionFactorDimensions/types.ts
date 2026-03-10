import { z } from "zod";
import type {
  GetEmissionFactorDimensionsQuerySchema,
  GetEmissionFactorDimensionsResponseSchema,
} from "./schemas.js";

export type GetEmissionFactorDimensionsQuery = z.infer<
  typeof GetEmissionFactorDimensionsQuerySchema
>;
export type GetEmissionFactorDimensionsResponse = z.infer<
  typeof GetEmissionFactorDimensionsResponseSchema
>;
