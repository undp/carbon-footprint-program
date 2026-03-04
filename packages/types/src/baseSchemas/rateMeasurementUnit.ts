import { z } from "zod";
import { IdSchema } from "../zod.js";

export const RateMeasurementUnitBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the rate measurement unit."),
  name: z.string().describe("The name of the rate measurement unit."),
  abbreviation: z
    .string()
    .describe("The abbreviation of the rate measurement unit."),
  numeratorMeasurementUnitId: IdSchema.describe(
    "The ID of the numerator measurement unit."
  ),
  denominatorMeasurementUnitId: IdSchema.describe(
    "The ID of the denominator measurement unit."
  ),
});
