import { z } from "zod";

// --------------------------------------------------------------------------------
// OBJECTIVE: Define the validation schema for the Get Book By ID feature.
// EXPLANATION:
// This file uses Zod to define the shape of the data we expect from the request
// (params, querystring, body) and the shape of the data we return (response).
// Fastify uses these schemas to automatically validate incoming requests and
// serialize outgoing responses. This ensures type safety and documentation.
// --------------------------------------------------------------------------------

export const GetBookByIdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .describe("The ID of the book to retrieve"),
});

export const GetBookByIdResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  author: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GetBookByIdParams = z.infer<typeof GetBookByIdParamsSchema>;
export type GetBookByIdResponse = z.infer<typeof GetBookByIdResponseSchema>;
