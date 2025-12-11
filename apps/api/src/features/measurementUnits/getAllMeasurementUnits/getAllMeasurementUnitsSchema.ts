import { z } from "zod";
import { MagnitudeSchema } from "../shared/schemas.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get All Measurement Units feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetAllMeasurementUnitsParamsSchema = z
  .void()
  .describe("No parameters required");

export const GetAllMeasurementUnitsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    magnitude: MagnitudeSchema,
    abbreviation: z.string(),
    base_factor: z.number(),
    is_base: z.boolean(),
  })
);

export type GetAllMeasurementUnitsResponse = z.infer<
  typeof GetAllMeasurementUnitsResponseSchema
>;
