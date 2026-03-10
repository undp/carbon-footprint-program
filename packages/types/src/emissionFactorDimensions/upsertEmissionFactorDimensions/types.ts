import { z } from "zod";
import type {
  UpsertEmissionFactorDimensionsRequestSchema,
  UpsertEmissionFactorDimensionsResponseSchema,
} from "./schemas.js";

export type UpsertEmissionFactorDimensionsRequest = z.infer<
  typeof UpsertEmissionFactorDimensionsRequestSchema
>;
export type UpsertEmissionFactorDimensionsResponse = z.infer<
  typeof UpsertEmissionFactorDimensionsResponseSchema
>;
