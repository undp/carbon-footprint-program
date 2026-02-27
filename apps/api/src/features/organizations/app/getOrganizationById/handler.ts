import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetOrganizationByIdParams } from "@repo/types";
import { getOrganizationByIdService } from "./service.js";

export const getOrganizationByIdHandler = async (
  request: FastifyRequest<{ Params: GetOrganizationByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id: organizationId } = request.params;

  log.info({ organizationId }, "Getting organization by ID...");

  const prisma = request.server.prisma;
  const result = await getOrganizationByIdService(prisma, organizationId);

  log.info({ organizationId }, "Organization retrieved successfully");
  return reply.status(200).send(result);
};
