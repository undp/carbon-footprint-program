import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetReductionProjectAccessParams } from "@repo/types";
import { getReductionProjectAccessService } from "./service.js";

export const getReductionProjectAccessHandler = async (
  request: FastifyRequest<{ Params: GetReductionProjectAccessParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const { id } = request.params;
  log.info(`Resolving reduction project ${id} access...`);

  const prisma = request.server.prisma;
  const userId = request.currentUser ? BigInt(request.currentUser.id) : null;
  const data = await getReductionProjectAccessService(prisma, id, userId);

  log.info({ id, canEdit: data.canEdit }, "Access resolved");
  return reply.status(200).send(data);
};
