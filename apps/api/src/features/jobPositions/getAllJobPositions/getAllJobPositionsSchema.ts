import { z } from "zod";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get All Job Positions feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetAllJobPositionsParamsSchema = z
  .void()
  .describe("No parameters required");

export const GetAllJobPositionsResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  })
);

export type GetAllJobPositionsResponse = z.infer<
  typeof GetAllJobPositionsResponseSchema
>;
