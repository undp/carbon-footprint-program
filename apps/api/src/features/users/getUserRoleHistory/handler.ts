import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserRoleHistoryService } from "./service.js";
import type {
  GetUserRoleHistoryParams,
  GetUserRoleHistoryResponse,
} from "@repo/types";

export const getUserRoleHistoryHandler = async (
  request: FastifyRequest<{
    Params: GetUserRoleHistoryParams;
    Reply: GetUserRoleHistoryResponse;
  }>,
  reply: FastifyReply
) => {
  const prisma = request.server.prisma;
  const history = await getUserRoleHistoryService(prisma, request.params.id);
  return reply.status(200).send(history);
};
