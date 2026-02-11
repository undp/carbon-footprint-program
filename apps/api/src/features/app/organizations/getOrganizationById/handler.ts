import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetOrganizationByIdParams } from "@repo/types";
import { getOrganizationByIdService } from "./service.js";

export const getOrganizationByIdHandler = async (
  request: FastifyRequest<{ Params: GetOrganizationByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "app-organizations" });
  const { id } = request.params;

  log.info({ organizationId: id }, "Getting organization by ID...");

  const prisma = request.server.prisma;

  // const authUserId = request.authUser?.idpUserId;
  // if (!authUserId) {
  //   // TODO: make AuthenticationError and return 401 (needs a shared error)
  //   throw new Error("User not authenticated");
  // }
  const organization = await getOrganizationByIdService(prisma, id);

  log.info({ organizationId: id }, "Organization retrieved successfully");
  return reply.status(200).send(organization);
};
