import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllRequestsService } from "./service.js";

export const getAllRequestsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-requests" });
  log.info("Getting all requests...");

  const prisma = request.server.prisma;
  const result = await getAllRequestsService(prisma);

  log.info("Requests retrieved successfully");
  return reply.status(200).send(result);
};
