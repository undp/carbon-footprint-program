import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestsKpisService } from "./service.js";

export const getRequestsKpisHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-requests" });
  log.info("Getting request KPIs...");

  const prisma = request.server.prisma;
  const result = await getRequestsKpisService(prisma);

  log.info("Request KPIs retrieved successfully");
  return reply.status(200).send(result);
};
