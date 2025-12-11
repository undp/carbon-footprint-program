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
