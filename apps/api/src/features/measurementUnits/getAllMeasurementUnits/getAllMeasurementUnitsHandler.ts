import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllMeasurementUnitsService } from "./getAllMeasurementUnitsService.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Coordinate the request/response flow for getting all measurement units.
// EXPLANATION:
// This function is the "controller" of the feature. It extracts data from the
// request, calls the service to perform the business logic, and sends the
// appropriate response. It handles HTTP-specific concerns like status codes
// and error handling (though global error handling is preferred).
// --------------------------------------------------------------------------------

export const getAllMeasurementUnitsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "measurementUnits" });
  log.info("Getting all measurement units...");

  const prisma = request.server.prisma;

  const measurementUnits = await getAllMeasurementUnitsService(prisma);

  if (!measurementUnits) {
    log.warn("Measurement units not found");
    return reply.status(404).send({ message: "Measurement units not found" });
  }
  log.info("Measurement units found successfully");

  return reply.status(200).send(measurementUnits);
};
