import { z } from "zod";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get All Job Positions feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetAllJobPositionsResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of job position"),
    name: z.string().min(1).describe("The name of job position"),
  })
);

export type GetAllJobPositionsResponse = z.infer<
  typeof GetAllJobPositionsResponseSchema
>;
