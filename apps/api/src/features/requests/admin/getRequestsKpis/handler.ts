import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestsKpisService } from "./service.js";

export const getRequestsKpisHandler = async (
  request: FastifyRequest<{ Querystring: { year?: number } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-requests" });
  log.info("Getting request KPIs...");

  const prisma = request.server.prisma;
  const { year } = request.query;
  const result = await getRequestsKpisService(prisma, year);

  log.info("Request KPIs retrieved successfully");
  return reply.status(200).send(result);
};
