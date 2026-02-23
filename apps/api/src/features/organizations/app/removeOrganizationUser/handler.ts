import type { FastifyReply, FastifyRequest } from "fastify";
import type { RemoveOrganizationUserParams } from "@repo/types";
import { removeOrganizationUserService } from "./service.js";

export const removeOrganizationUserHandler = async (
  request: FastifyRequest<{
    Params: RemoveOrganizationUserParams;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const log = request.log.child({ module: "organization-users" });
  const { organizationId, userId } = request.params;

  log.info({ organizationId, userId }, "Removing user from organization...");

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  await removeOrganizationUserService(prisma, organizationId, userId, user);

  log.info(
    { organizationId, userId },
    "User removed from organization successfully"
  );

  return reply.status(200).send({});
};
