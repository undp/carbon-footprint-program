import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetReductionProjectByIdParams } from "@repo/types";
import { getReductionProjectByIdService } from "./service.js";

export const getReductionProjectByIdHandler = async (
  request: FastifyRequest<{ Params: GetReductionProjectByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const { id } = request.params;
  log.info(`Getting reduction project ${id}...`);

  const prisma = request.server.prisma;
  const userId = request.currentUser ? BigInt(request.currentUser.id) : null;
  const data = await getReductionProjectByIdService(prisma, id, userId);

  log.info("Reduction project found successfully");
  return reply.status(200).send(data);
};
