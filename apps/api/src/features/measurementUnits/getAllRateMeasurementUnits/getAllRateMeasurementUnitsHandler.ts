import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllRateMeasurementUnitsService } from "./getAllRateMeasurementUnitsService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all rate measurement units.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllRateMeasurementUnitsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "rateMeasurementUnits" });
  log.info("Getting all rate measurement units...");

  const prisma = request.server.prisma;

  const rateMeasurementUnits = await getAllRateMeasurementUnitsService(prisma);

  if (!rateMeasurementUnits.length) {
    log.warn("Rate measurement units not found");
    return reply
      .status(404)
      .send({ message: "Rate measurement units not found" });
  }
  log.info("Rate measurement units found successfully");

  return reply.status(200).send(rateMeasurementUnits);
};
