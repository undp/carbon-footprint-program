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
        tags: ["books"],
        summary: "Get a book by ID",
        description: "Get a book by its unique identifier",
        params: GetBookByIdParamsSchema,
        response: {
          200: GetBookByIdResponseSchema,
        },
      },
    },
    getBookByIdHandler
  );
};
