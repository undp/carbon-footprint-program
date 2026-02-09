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

  const data = await getCarbonInventoryResultsService(
    prisma,
    carbonInventoryId
  );

  log.info({ carbonInventoryId }, "Emission results retrieved successfully");
  return reply.status(200).send(data);
};
