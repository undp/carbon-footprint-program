import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  MeasurementUnitBaseSchema,
  MeasurementUnitStatusSchema,
} from "../../baseSchemas/index.js";

const NestedMeasurementUnitSchema = MeasurementUnitBaseSchema.pick({
  id: true,
  name: true,
  magnitude: true,
  abbreviation: true,
});

const RateMeasurementUnitItemSchema = z.object({
  id: IdSchema.describe("The ID of the rate measurement unit"),
  name: z.string().min(1).describe("The name of the rate measurement unit"),
  abbreviation: z
    .string()
    .min(1)
    .describe("The abbreviation of the rate measurement unit"),
  status: MeasurementUnitStatusSchema.describe(
    "The status of the rate measurement unit."
  ),
  numeratorUnit: NestedMeasurementUnitSchema.describe(
    "The numerator measurement unit of the rate measurement unit"
  ),
  denominatorUnit: NestedMeasurementUnitSchema.describe(
    "The denominator measurement unit of the rate measurement unit"
  ),
});

export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  RateMeasurementUnitItemSchema
);
