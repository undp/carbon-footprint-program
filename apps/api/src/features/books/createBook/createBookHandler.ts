import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateBookBody } from "./createBookSchema.js";
import { createBookService } from "./createBookService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for creating a book.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const createBookHandler = async (
  request: FastifyRequest<{ Body: CreateBookBody }>,
  reply: FastifyReply
) => {
  const body = request.body;

  const prisma = request.server.prisma;

  const book = await createBookService(prisma, body);

  return reply.status(201).send(book);
};
