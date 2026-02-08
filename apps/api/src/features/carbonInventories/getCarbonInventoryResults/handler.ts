import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventoryResultsService } from "./service.js";

export const getCarbonInventoryResultsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryResults" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting emission results for carbon inventory..."
  );

  const prisma = request.server.prisma;

  const result = await getCarbonInventoryResultsService(
    prisma,
    carbonInventoryId
  );

  if (!result.success) {
    if (result.error === "CARBON_INVENTORY_NOT_FOUND") {
      log.warn({ carbonInventoryId }, "Carbon inventory not found");
      return reply.status(404).send({
        code: "CARBON_INVENTORY_NOT_FOUND",
        message: "Carbon inventory not found",
      });
    }

    log.warn(
      { carbonInventoryId },
      "Methodology not found for carbon inventory"
    );
    return reply.status(404).send({
      code: "METHODOLOGY_NOT_FOUND",
      message: "Methodology not found for this inventory",
    });
  }

  log.info(
    { carbonInventoryId },
    "Emission results retrieved successfully"
  );
  return reply.status(200).send(result.data);
};
