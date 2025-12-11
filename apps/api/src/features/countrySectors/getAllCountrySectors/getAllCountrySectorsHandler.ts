import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllCountrySectorsService } from "./getAllCountrySectorsService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all country sectors.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllCountrySectorsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "countrySectors" });
  log.info("Getting all country sectors...");

  const prisma = request.server.prisma;

  const countrySectors = await getAllCountrySectorsService(prisma);

  if (!countrySectors.length) {
    log.warn("Country sectors not found");
    return reply.status(404).send({ message: "Country sectors not found" });
  }
  log.info("Country sectors found successfully");

  return reply.status(200).send(countrySectors);
};
