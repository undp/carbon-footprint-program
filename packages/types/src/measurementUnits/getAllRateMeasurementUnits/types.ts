import { z } from "zod";
import { GetAllRateMeasurementUnitsResponseSchema } from "./schemas.js";

export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;
