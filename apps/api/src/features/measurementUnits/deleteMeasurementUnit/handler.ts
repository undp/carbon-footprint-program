import type { FastifyReply, FastifyRequest } from "fastify";
import { deleteMeasurementUnitService } from "./service.js";
import type {
  DeleteMeasurementUnitParams,
  DeleteMeasurementUnitResponse,
} from "@repo/types";

export const deleteMeasurementUnitHandler = async (
  request: FastifyRequest<{ Params: DeleteMeasurementUnitParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "measurementUnits" });
  const { id } = request.params;
  log.info({ id }, "Soft-deleting measurement unit...");

  const prisma = request.server.prisma;
  const result: DeleteMeasurementUnitResponse =
    await deleteMeasurementUnitService(prisma, id);

  log.info({ id }, "Measurement unit soft-deleted successfully");
  return reply.status(200).send(result);
};
