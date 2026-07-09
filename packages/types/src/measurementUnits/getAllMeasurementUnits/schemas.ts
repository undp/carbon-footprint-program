import { z } from "zod";
import {
  MagnitudeBaseSchema,
  MeasurementUnitBaseSchema,
} from "../../baseSchemas/index.js";

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitBaseSchema.extend({
    magnitude: MagnitudeBaseSchema,
  })
);
