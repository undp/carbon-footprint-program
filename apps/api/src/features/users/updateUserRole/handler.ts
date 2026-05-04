import type { FastifyReply, FastifyRequest } from "fastify";
import { updateUserRoleService } from "./service.js";
import type { UpdateUserRoleBody, UpdateUserRoleParams } from "@repo/types";

export const updateUserRoleHandler = async (
  request: FastifyRequest<{
    Params: UpdateUserRoleParams;
    Body: UpdateUserRoleBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  const actorUserId = request.currentUser!.id;
  const { id: targetUserId } = request.params;
  const { role: newRole } = request.body;

  log.info({ targetUserId, newRole }, "Updating user role...");

  const updatedUser = await updateUserRoleService(
    request.server.prisma,
    targetUserId,
    newRole,
    actorUserId
  );

  log.info({ targetUserId }, "User role updated successfully");
  return reply.status(200).send(updatedUser);
};
