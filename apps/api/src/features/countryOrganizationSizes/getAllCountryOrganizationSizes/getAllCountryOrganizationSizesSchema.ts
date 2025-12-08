import { z } from "zod";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get All Country Organization Sizes feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetAllCountryOrganizationSizesParamsSchema = z
  .void()
  .describe("No parameters required");

export const GetAllCountryOrganizationSizesResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  })
);

export type GetAllCountryOrganizationSizesResponse = z.infer<
  typeof GetAllCountryOrganizationSizesResponseSchema
>;

export const GetAllCountryOrganizationSizesNotFoundErrorSchema = z
  .object({
    message: z.string(),
  })
  .describe("Not found error response");
