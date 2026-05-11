import { z } from "zod";
import { IdSchema } from "../zod.js";
import { MeasurementUnitStatus } from "@repo/database/enums";

export const MeasurementUnitStatusSchema = z.enum(MeasurementUnitStatus);

export const MeasurementUnitBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the measurement unit."),
  name: z.string().describe("The name of the measurement unit."),
  magnitudeId: IdSchema.describe(
    "The id of the magnitude this measurement unit belongs to."
  ),
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
