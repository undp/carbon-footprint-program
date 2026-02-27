import { z } from "zod";
import { MeasurementUnitSchema } from "../../baseSchemas/measurementUnit.js";

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitSchema
);
