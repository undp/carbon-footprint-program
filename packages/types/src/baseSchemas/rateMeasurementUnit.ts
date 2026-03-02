import { z } from "zod";
import { IdSchema } from "../zod.js";

export const RateMeasurementUnitBaseSchema = z.object({
  id: IdSchema,
  name: z.string(),
  abbreviation: z.string(),
  numeratorMeasurementUnitId: IdSchema,
  denominatorMeasurementUnitId: IdSchema,
});
