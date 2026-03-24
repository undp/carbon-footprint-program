import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetReductionProjectByIdParams } from "@repo/types";
import { getReductionProjectByIdService } from "./service.js";

export const getReductionProjectByIdHandler = async (
  request: FastifyRequest<{ Params: GetReductionProjectByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { id } = request.params;

  log.info(`Getting reduction project ${id}...`);
  const result = await getReductionProjectByIdService(prisma, id, user);
  log.info(`Reduction project ${id} retrieved`);

  return reply.status(200).send(result);
};
