import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryAccessParams } from "@repo/types";
import { getCarbonInventoryAccessService } from "./service.js";

export const getCarbonInventoryAccessHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryAccessParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  const { id: carbonInventoryId } = request.params;
  log.info({ carbonInventoryId }, "Resolving carbon inventory access...");

  const prisma = request.server.prisma;
  const userId = request.currentUser ? BigInt(request.currentUser.id) : null;
  const data = await getCarbonInventoryAccessService(
    prisma,
    carbonInventoryId,
    userId
  );

  log.info({ carbonInventoryId, canEdit: data.canEdit }, "Access resolved");
  return reply.status(200).send(data);
};
