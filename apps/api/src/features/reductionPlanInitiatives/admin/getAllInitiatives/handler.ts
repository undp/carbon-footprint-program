import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllInitiativesService } from "./service.js";

export const getAllInitiativesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-reduction-plan-initiatives" });
  log.info("Getting all reduction plan initiatives...");

  const prisma = request.server.prisma;
  const result = await getAllInitiativesService(prisma);

  log.info("Reduction plan initiatives retrieved successfully");
  return reply.status(200).send(result);
};
