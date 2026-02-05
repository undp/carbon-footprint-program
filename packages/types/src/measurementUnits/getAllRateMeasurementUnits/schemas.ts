import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { MeasurementUnitSchema } from "../getAllMeasurementUnits/schemas.js";

const RateUnitComponentSchema = MeasurementUnitSchema.pick({
  id: true,
  name: true,
  magnitude: true,
  abbreviation: true,
});

export const RateMeasurementUnitSchema = z.object({
  id: IdSchema.describe("The ID of the rate measurement unit"),
  name: z.string().min(1).describe("The name of the rate measurement unit"),
  abbreviation: z
    .string()
    .min(1)
    .describe("The abbreviation of the rate measurement unit"),
  numeratorUnit: RateUnitComponentSchema.describe(
    "The numerator measurement unit of the rate measurement unit"
  ),
  denominatorUnit: RateUnitComponentSchema.describe(
    "The denominator measurement unit of the rate measurement unit"
  ),
});

export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  RateMeasurementUnitSchema
);
