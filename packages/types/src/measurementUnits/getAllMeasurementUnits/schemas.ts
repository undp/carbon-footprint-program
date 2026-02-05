import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { Magnitude } from "@repo/database/enums";

export const MeasurementUnitSchema = z.object({
  id: IdSchema.describe("The ID of the measurement unit"),
  name: z.string().min(1).describe("The name of the measurement unit"),
  magnitude: z.enum(Magnitude),
  abbreviation: z
    .string()
    .min(1)
    .describe("The abbreviation of the measurement unit"),
  baseFactor: z.number().describe("The base factor of the measurement unit"),
  isBase: z.boolean().describe("Whether the measurement unit is a base unit"),
});

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitSchema
);
