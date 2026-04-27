import type { FastifyReply, FastifyRequest } from "fastify";
import { createMeasurementUnitService } from "./service.js";
import type {
  CreateMeasurementUnitBody,
  CreateMeasurementUnitResponse,
} from "@repo/types";

export const createMeasurementUnitHandler = async (
  request: FastifyRequest<{ Body: CreateMeasurementUnitBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "measurementUnits" });
  log.info("Creating measurement unit...");

  const prisma = request.server.prisma;
  const result: CreateMeasurementUnitResponse =
    await createMeasurementUnitService(prisma, request.body);

  log.info(
    { action: result.action },
    "Measurement unit processed successfully"
  );
  return reply.status(200).send(result);
};
