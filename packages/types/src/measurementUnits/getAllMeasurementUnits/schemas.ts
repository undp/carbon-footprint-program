import { z } from "zod";
import { MeasurementUnitBaseSchema } from "../../baseSchemas/index.js";

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitBaseSchema.pick({
    id: true,
    name: true,
    magnitude: true,
    abbreviation: true,
    baseFactor: true,
    isBase: true,
  })
);
