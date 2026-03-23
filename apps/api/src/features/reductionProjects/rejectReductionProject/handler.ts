import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  RejectReductionProjectParams,
  RejectReductionProjectBody,
} from "@repo/types";
import { rejectReductionProjectService } from "./service.js";

export const rejectReductionProjectHandler = async (
  request: FastifyRequest<{
    Params: RejectReductionProjectParams;
    Body: RejectReductionProjectBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionProjects" });
  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const { id } = request.params;
  const body = request.body;

  log.info(`Rejecting reduction project ${id}...`);
  const result = await rejectReductionProjectService(
    prisma,
    id,
    body,
    user
  );

  log.info(`Reduction project ${id} rejected`);
  return reply.status(200).send(result);
};
