import type { FastifyReply, FastifyRequest } from "fastify";
import { getOrganizationKpisService } from "./service.js";

export const getOrganizationKpisHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-organizations" });
  log.info("Getting organization KPIs...");

  const prisma = request.server.prisma;
  const result = await getOrganizationKpisService(prisma);

  log.info("Organization KPIs retrieved successfully");
  return reply.status(200).send(result);
};
