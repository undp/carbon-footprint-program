import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventoryMetadataService } from "./service.js";

export const getCarbonInventoryMetadataHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryMetadata" });
  const carbonInventoryId = request.params.id;

  log.info({ carbonInventoryId }, "Getting carbon inventory metadata...");

  const prisma = request.server.prisma;
  const userId = request.currentUser ? BigInt(request.currentUser.id) : null;
  const data = await getCarbonInventoryMetadataService(
    prisma,
    carbonInventoryId,
    userId
  );

  log.info(
    { carbonInventoryId },
    "Carbon inventory metadata retrieved successfully"
  );
  return reply.status(200).send(data);
};
