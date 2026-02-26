import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApproveRequestParams, ApproveRequestBody } from "@repo/types";
import { approveRequestService } from "./service.js";

export const approveRequestHandler = async (
  request: FastifyRequest<{
    Params: ApproveRequestParams;
    Body: ApproveRequestBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-requests" });
  const { id } = request.params;
  log.info(`Approving request ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;
  const result = await approveRequestService(
    prisma,
    id,
    request.body,
    user
  );

  log.info(`Request ${id} approved successfully`);
  return reply.status(200).send(result);
};
