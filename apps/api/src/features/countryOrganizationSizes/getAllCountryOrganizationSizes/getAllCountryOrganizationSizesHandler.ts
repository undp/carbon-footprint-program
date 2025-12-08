import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllCountryOrganizationSizesService } from "./getAllCountryOrganizationSizesService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all country organization sizes.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllCountryOrganizationSizesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "countryOrganizationSizes" });
  log.info("Getting all country organization sizes...");

  const prisma = request.server.prisma;

  const countryOrganizationSizes =
    await getAllCountryOrganizationSizesService(prisma);

  if (!countryOrganizationSizes) {
    log.warn("Country organization sizes not found");
    return reply
      .status(404)
      .send({ message: "Country organization sizes not found" });
  }
  log.info("Country organization sizes found successfully");

  return reply.status(200).send(countryOrganizationSizes);
};
