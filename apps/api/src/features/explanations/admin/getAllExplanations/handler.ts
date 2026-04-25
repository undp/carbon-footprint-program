import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllExplanationsService } from "./service.js";

export const getAllExplanationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-explanations" });
  log.info("Getting all explanations...");

  const prisma = request.server.prisma;
  const explanations = await getAllExplanationsService(prisma);

  log.info({ count: explanations.length }, "Explanations retrieved");
  return reply.status(200).send(explanations);
};
