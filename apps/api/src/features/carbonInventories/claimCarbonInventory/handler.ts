import type { FastifyReply, FastifyRequest } from "fastify";
import type { ClaimCarbonInventoryParams } from "@repo/types";
import { claimCarbonInventoryService } from "./service.js";

export const claimCarbonInventoryHandler = async (
  request: FastifyRequest<{ Params: ClaimCarbonInventoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  const user = request.currentUser!;
  const { id } = request.params;
  const uuid = request.headers["x-carbon-inventory-uuid"];

  log.info(`Claiming carbon inventory ${id}...`);

  const prisma = request.server.prisma;
  await claimCarbonInventoryService(prisma, id, uuid, user);

  log.info(`Carbon inventory ${id} claimed successfully`);
  return reply.status(200).send(null);
};
