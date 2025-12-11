import { z } from "zod";
import { MagnitudeSchema } from "../shared/schemas.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get All Rate Measurement Units feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetAllRateMeasurementUnitsParamsSchema = z
  .void()
  .describe("No parameters required");

export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  z.object({
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
      name: z
        .string()
        .min(1)
        .describe("The name of numerator measurement unit"),
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
  })
);

export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;
