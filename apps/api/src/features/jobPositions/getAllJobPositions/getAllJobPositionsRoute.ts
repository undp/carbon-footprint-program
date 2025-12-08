import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllJobPositionsHandler } from "./getAllJobPositionsHandler.js";
import {
  GetAllJobPositionsParamsSchema,
  GetAllJobPositionsResponseSchema,
} from "./getAllJobPositionsSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Get Book By ID feature.
// EXPLANATION:
// This file connects the URL path (e.g., /books/:id) to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

export const getAllJobPositionsRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/",
    {
      schema: {
        tags: ["job-positions"],
        summary: "Get all job positions",
        description: "Get all job positions",
        response: {
          200: GetAllJobPositionsResponseSchema,
        },
      },
    },
    getAllJobPositionsHandler
  );
};
