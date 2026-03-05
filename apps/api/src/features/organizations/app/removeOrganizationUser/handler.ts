import type { FastifyReply, FastifyRequest } from "fastify";
import type { RemoveOrganizationUserParams } from "@repo/types";
import { removeOrganizationUserService } from "./service.js";

export const removeOrganizationUserHandler = async (
  request: FastifyRequest<{
    Params: RemoveOrganizationUserParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organization-users" });
  const { organizationId, organizationUserId } = request.params;

  log.info(
    { organizationId, organizationUserId },
    "Removing user from organization..."
  );

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  const data = await removeOrganizationUserService(
    prisma,
    organizationId,
    organizationUserId,
    user
  );

  log.info(
    { organizationId, organizationUserId },
    "User removed from organization successfully"
  );

  return reply.status(200).send(data);
};
