import type { FastifyReply, FastifyRequest } from "fastify";
import { getCurrentMethodologyService } from "./getCurrentMethodologyService.js";

export const getCurrentMethodologyHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodology" });
  log.info("Getting current methodology...");

  const prisma = request.server.prisma;

  const data = await getCurrentMethodologyService(prisma);

  if (!data) {
    log.warn("Methodology not found");
    return reply.status(404).send({ message: "Methodology not found" });
  }

  log.info("Methodology found successfully");
  return reply.status(200).send(data);
};
