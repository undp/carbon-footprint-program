import type { FastifyZodInstance } from "../../../types/fastify.js";
import { createBookHandler } from "./createBookHandler.js";
import {
  CreateBookBodySchema,
  CreateBookResponseSchema,
} from "./createBookSchema.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Register the route for the Create Book feature.
// EXPLANATION:
// This file connects the URL path (e.g., /books) to the handler.
// It also registers the Zod schemas for validation. This is the entry point
// for this specific feature within the Fastify application.
// --------------------------------------------------------------------------------

export const createBookRoute = (fastify: FastifyZodInstance) => {
  fastify.post(
    "/",
    {
      schema: {
        body: CreateBookBodySchema,
        response: {
          201: CreateBookResponseSchema,
        },
      },
    },
    createBookHandler
  );
};
