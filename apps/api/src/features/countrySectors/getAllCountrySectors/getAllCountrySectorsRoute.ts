import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCountrySectorsHandler } from "./getAllCountrySectorsHandler.js";
import {
  GetAllCountrySectorsResponseSchema,
  GetAllCountrySectorsNotFoundErrorSchema,
} from "./getAllCountrySectorsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Get All Country Sectors feature.
// EXPLANATION:
// This file connects the URL path to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

export const getAllCountrySectorsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["country-sectors"],
        summary: "Get all country sectors",
        description: "Retrieves all country sectors with their details",
        response: {
          200: GetAllCountrySectorsResponseSchema,
          404: GetAllCountrySectorsNotFoundErrorSchema,
        },
      },
    },
    getAllCountrySectorsHandler
  );
};
