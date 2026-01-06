import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventoryMethodologyService } from "./getCarbonInventoryMethodologyService.js";

export const getCarbonInventoryMethodologyHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodology" });
  const carbonInventoryId = BigInt(request.params.id);

  log.info(
    { carbonInventoryId },
    "Getting methodology for carbon inventory..."
  );

  const prisma = request.server.prisma;

  const result = await getCarbonInventoryMethodologyService(
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
      message: "Methodology not found",
    });
  }

  log.info({ carbonInventoryId }, "Methodology found successfully");
  return reply.status(200).send(result.data);
};
