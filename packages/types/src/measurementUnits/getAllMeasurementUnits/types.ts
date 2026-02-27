import { z } from "zod";

import type { GetAllMeasurementUnitsResponseSchema } from "./schemas.js";
import { MeasurementUnitSchema } from "../../baseSchemas/measurementUnit.js";

export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;

export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
