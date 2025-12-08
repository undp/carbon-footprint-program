import { z } from "zod";

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

export const MagnitudeSchema = z.enum(["MASS", "VOLUME", "DISTANCE", "TIME"]);

export const GetAllRateMeasurementUnitsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    abbreviation: z.string(),
    numerator_unit: z.object({
      id: z.string(),
      name: z.string(),
      magnitude: MagnitudeSchema,
      abbreviation: z.string(),
    }),
    denominator_unit: z.object({
      id: z.string(),
      name: z.string(),
      magnitude: MagnitudeSchema,
      abbreviation: z.string(),
    }),
  })
);

export type GetAllRateMeasurementUnitsResponse = z.infer<
  typeof GetAllRateMeasurementUnitsResponseSchema
>;

export const GetAllRateMeasurementUnitsNotFoundErrorSchema = z
  .object({
    message: z.string(),
  })
  .describe("Not found error response");
