import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
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

export const createBookRoute = (fastify: FastifyInstance) => {
  fastify.withTypeProvider<ZodTypeProvider>().post(
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
