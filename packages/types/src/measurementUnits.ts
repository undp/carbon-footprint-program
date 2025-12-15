import { z } from "zod";

export const MagnitudeSchema = z.enum(["MASS", "VOLUME", "DISTANCE", "TIME"]);

export const MeasurementUnitSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of measurement unit"),
  name: z.string().min(1).describe("The name of measurement unit"),
  magnitude: MagnitudeSchema,
  abbreviation: z
    .string()
    .min(1)
    .describe("The abbreviation of measurement unit"),
  base_factor: z.number().describe("The base factor of measurement unit"),
  is_base: z.boolean().describe("Whether the measurement unit is a base unit"),
});

export const RateMeasurementUnitSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of rate measurement unit"),
  name: z.string().min(1).describe("The name of rate measurement unit"),
  abbreviation: z
    .string()
    .min(1)
    .describe("The abbreviation of rate measurement unit"),
  numerator_unit: z.object({
    id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of numerator measurement unit"),
    name: z.string().min(1).describe("The name of numerator measurement unit"),
    magnitude: MagnitudeSchema,
    abbreviation: z
      .string()
      .min(1)
      .describe("The abbreviation of numerator measurement unit"),
  }),
  denominator_unit: z.object({
    id: z
      .string()
      .regex(/^\d+$/)
      .describe("The ID of denominator measurement unit"),
    name: z
      .string()
      .min(1)
      .describe("The name of denominator measurement unit"),
    magnitude: MagnitudeSchema,
    abbreviation: z
      .string()
      .min(1)
      .describe("The abbreviation of denominator measurement unit"),
  }),
});

export const GetAllMeasurementUnitsResponseSchema = z.array(
  MeasurementUnitSchema
);
export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  RateMeasurementUnitSchema
);

export type Magnitude = z.infer<typeof MagnitudeSchema>;
export type MeasurementUnit = z.infer<typeof MeasurementUnitSchema>;
export type RateMeasurementUnit = z.infer<typeof RateMeasurementUnitSchema>;
export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;
