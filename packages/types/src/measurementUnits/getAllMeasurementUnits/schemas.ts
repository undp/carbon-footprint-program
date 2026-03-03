import { z } from "zod";
import { MeasurementUnitBaseSchema } from "../../baseSchemas/index.js";

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitBaseSchema
);
