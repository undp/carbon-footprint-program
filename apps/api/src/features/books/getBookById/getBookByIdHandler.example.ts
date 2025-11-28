import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetBookByIdParams } from "./getBookByIdSchema.example.js";
import { getBookByIdService } from "./getBookByIdService.example.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting a book by ID.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getBookByIdHandler = async (
  request: FastifyRequest<{ Params: GetBookByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "books" });
  log.info("Getting book by ID...");
  const { id } = request.params;

  // In a real app, 'prisma' would be attached to the fastify instance
  // e.g., const { prisma } = request.server;
  // For this example, we assume it's available.
  const prisma = request.server.prisma;

  const book = await getBookByIdService(prisma, id);

  if (!book) {
    log.error("Book not found");
    return reply.status(404).send({ message: "Book not found" });
  }
  log.info("Book found successfully");

  return reply.status(200).send(book);
};
