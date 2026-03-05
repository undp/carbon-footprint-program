import type { FastifyReply, FastifyRequest } from "fastify";
import type { RejectRequestParams, RejectRequestBody } from "@repo/types";
import { rejectRequestService } from "./service.js";

export const rejectRequestHandler = async (
  request: FastifyRequest<{
    Params: RejectRequestParams;
    Body: RejectRequestBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-requests" });
  const { id } = request.params;
  log.info(`Rejecting request ${id}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser!; // guaranteed by the requireRoles hook
  const result = await rejectRequestService(prisma, id, request.body, user.id);

  log.info(`Request ${id} rejected successfully`);
  return reply.status(200).send(result);
};
