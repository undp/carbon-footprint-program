import { z } from "zod";
import { IdSchema } from "../zod.js";
import { Magnitude, MeasurementUnitStatus } from "@repo/database/enums";

export const MagnitudeSchema = z.enum(Magnitude);
export const MeasurementUnitStatusSchema = z.nativeEnum(MeasurementUnitStatus);

export const MeasurementUnitBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the measurement unit."),
  name: z.string().describe("The name of the measurement unit."),
  magnitude: MagnitudeSchema.describe("The magnitude of the measurement unit."),
  abbreviation: z
    .string()
    .describe("The abbreviation of the measurement unit."),
  baseFactor: z.number().describe("The base factor of the measurement unit."),
  isBase: z
    .boolean()
    .describe("Indicates if the measurement unit is a base unit."),
  status: MeasurementUnitStatusSchema.describe(
    "The status of the measurement unit."
  ),
  referenceCount: z
    .number()
    .int()
    .nonnegative()
    .describe(
      "Number of active references across line inputs, factors, and subcategory assignments."
    ),
});
