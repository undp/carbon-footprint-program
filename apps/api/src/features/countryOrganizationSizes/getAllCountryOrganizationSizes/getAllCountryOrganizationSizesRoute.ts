import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountryOrganizationSizesHandler } from "./getAllCountryOrganizationSizesHandler.js";
import {
  GetAllCountryOrganizationSizesResponseSchema,
  GetAllCountryOrganizationSizesNotFoundErrorSchema,
} from "./getAllCountryOrganizationSizesSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Get All Country Organization Sizes feature.
// EXPLANATION:
// This file connects the URL path to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

export const getAllCountryOrganizationSizesRoute = (
  fastify: FastifyZodInstance
) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["country-organization-sizes"],
        summary: "Get all country organization sizes",
        description:
          "Retrieves all country organization sizes with their details",
        response: {
          200: GetAllCountryOrganizationSizesResponseSchema,
          404: GetAllCountryOrganizationSizesNotFoundErrorSchema,
        },
      },
    },
    getAllCountryOrganizationSizesHandler
  );
};
