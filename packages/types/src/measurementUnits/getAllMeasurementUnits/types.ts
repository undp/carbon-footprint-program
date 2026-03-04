import { z } from "zod";
import type { GetAllMeasurementUnitsResponseSchema } from "./schemas.js";

export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
