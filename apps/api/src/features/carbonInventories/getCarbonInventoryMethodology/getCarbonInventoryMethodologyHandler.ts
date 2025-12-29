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

  const data = await getCarbonInventoryMethodologyService(
    prisma,
    carbonInventoryId
  );

  if (!data) {
    log.warn(
      { carbonInventoryId },
      "Methodology not found for carbon inventory"
    );
    return reply.status(404).send({ message: "Methodology not found" });
  }

  log.info({ carbonInventoryId }, "Methodology found successfully");
  return reply.status(200).send(data);
};
