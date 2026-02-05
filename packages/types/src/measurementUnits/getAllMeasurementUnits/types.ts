import { z } from "zod";
import type {
  GetAllMeasurementUnitsResponseSchema,
  MeasurementUnitSchema,
} from "./schemas.js";

export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
