import { z } from "zod";
import { IdSchema } from "./zod.js";
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

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitSchema
);
export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  RateMeasurementUnitSchema
);

export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;
export type RateMeasurementUnit = z.infer<typeof RateMeasurementUnitSchema>;
export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;
