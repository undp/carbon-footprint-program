import type { FastifyZodInstance } from "@/types/fastify.js";
import { createBookHandler } from "./createBookHandler.example.js";
import {
  CreateBookBodySchema,
  CreateBookResponseSchema,
} from "./createBookSchema.example.js";

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
        tags: ["books"],
        summary: "Create a new book",
        description: "Create a new book with the given title and author",
        body: CreateBookBodySchema,
        response: {
          201: CreateBookResponseSchema,
        },
      },
    },
    createBookHandler
  );
};
