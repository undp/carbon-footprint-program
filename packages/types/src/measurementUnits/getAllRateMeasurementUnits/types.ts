import { z } from "zod";
import type { GetAllRateMeasurementUnitsResponseSchema } from "./schemas.js";

export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;
