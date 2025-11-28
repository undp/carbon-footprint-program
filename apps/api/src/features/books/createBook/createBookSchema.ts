import { z } from "zod";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Create Book feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (body) and the shape of the data we return (response). Fastify uses these
// schemas to automatically validate incoming requests and serialize outgoing
// responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const CreateBookBodySchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .describe("The title of the book"),
  author: z
    .string()
    .min(1, "Author is required")
    .describe("The author of the book"),
});

export const CreateBookResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateBookBody = z.infer<typeof CreateBookBodySchema>;
export type CreateBookResponse = z.infer<typeof CreateBookResponseSchema>;
