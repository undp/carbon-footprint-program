import type { FastifyReply, FastifyRequest } from "fastify";
import { duplicateCarbonInventoryService } from "./service.js";

export const duplicateCarbonInventoryHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  const { id } = request.params;
  log.info(`Duplicating carbon inventory with ID: ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser;

  const result = await duplicateCarbonInventoryService(prisma, id, user);

  log.info("Carbon inventory duplicated successfully");
  return reply.status(201).send(result);
};
