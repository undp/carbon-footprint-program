import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetAllOrganizationsQuery } from "@repo/types";
import { getAllOrganizationsService } from "./service.js";

export const getAllOrganizationsHandler = async (
  request: FastifyRequest<{ Querystring: GetAllOrganizationsQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-organizations" });
  log.info("Getting all organizations...");

  const prisma = request.server.prisma;
  const result = await getAllOrganizationsService(prisma, request.query);

  log.info("Organizations retrieved successfully");
  return reply.status(200).send(result);
};
