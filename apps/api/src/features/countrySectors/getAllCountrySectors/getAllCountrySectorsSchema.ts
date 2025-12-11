import { z } from "zod";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get All Country Sectors feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetAllCountrySectorsParamsSchema = z
  .void()
  .describe("No parameters required");

const CountrySubsectorSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of subsector"),
  name: z.string().min(1).describe("The name of subsector"),
});

export const GetAllCountrySectorsResponseSchema = z.array(
  z.object({
    id: z.string().regex(/^\d+$/).describe("The ID of sector"),
    name: z.string().min(1).describe("The name of sector"),
    subsectors: z.array(CountrySubsectorSchema),
  })
);

export type GetAllCountrySectorsResponse = z.infer<
  typeof GetAllCountrySectorsResponseSchema
>;
