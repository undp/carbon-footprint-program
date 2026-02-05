import { z } from "zod";
import type {
  GetAllRateMeasurementUnitsResponseSchema,
  RateMeasurementUnitSchema,
} from "./schemas.js";

export type RateMeasurementUnit = z.infer<typeof RateMeasurementUnitSchema>;

export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;
