import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllJobPositionsService } from "./getAllJobPositionsService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all job positions.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllJobPositionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "jobPositions" });
  log.info("Getting all job positions...");

  // In a real app, 'prisma' would be attached to the fastify instance
  // e.g., const { prisma } = request.server;
  // For this example, we assume it's available.
  const prisma = request.server.prisma;

  const jobPositions = await getAllJobPositionsService(prisma);

  if (!jobPositions) {
    log.warn("Job positions not found");
    return reply.status(404).send({ message: "Job positions not found" });
  }
  log.info("Job positions found successfully");

  return reply.status(200).send(jobPositions);
};
