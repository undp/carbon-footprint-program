import type { FastifyZodInstance } from "../../../types/fastify.js";
import { getBookByIdHandler } from "./getBookByIdHandler.example.js";
import {
  GetBookByIdParamsSchema,
  GetBookByIdResponseSchema,
} from "./getBookByIdSchema.example.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Get Book By ID feature.
// EXPLANATION:
// This file connects the URL path (e.g., /books/:id) to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

export const getBookByIdRoute = (fastify: FastifyZodInstance) => {
  fastify.get(
    "/:id",
    {
      schema: {
        params: GetBookByIdParamsSchema,
        response: {
          200: GetBookByIdResponseSchema,
        },
      },
    },
    getBookByIdHandler
  );
};
