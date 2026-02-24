import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateOrganizationUserRoleParams,
  UpdateOrganizationUserRoleBody,
} from "@repo/types";
import { updateOrganizationUserRoleService } from "./service.js";

export const updateOrganizationUserRoleHandler = async (
  request: FastifyRequest<{
    Params: UpdateOrganizationUserRoleParams;
    Body: UpdateOrganizationUserRoleBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "organization-users" });
  const { organizationId, userId } = request.params;
  const body = request.body;

  log.info(
    { organizationId, userId, newRole: body.role },
    "Updating user role in organization..."
  );

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  const data = await updateOrganizationUserRoleService(
    prisma,
    organizationId,
    userId,
    body,
    user
  );

  log.info(
    { organizationId, userId, role: data.role },
    "User role updated successfully"
  );

  return reply.status(200).send(data);
};
