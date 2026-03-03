import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetOrganizationUsersParams } from "@repo/types";
import { getOrganizationUsersService } from "./service.js";

export const getOrganizationUsersHandler = async (
  request: FastifyRequest<{
    Params: GetOrganizationUsersParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organization-users" });
  const { organizationId } = request.params;

  log.info({ organizationId }, "Getting organization users...");

  const prisma = request.server.prisma;
  const userId = request.currentUser!.id;

  const data = await getOrganizationUsersService(
    prisma,
    organizationId,
    userId
  );

  log.info(
    { organizationId, userCount: data.length },
    "Organization users retrieved successfully"
  );

  return reply.status(200).send(data);
};
