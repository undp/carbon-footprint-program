import type { FastifyReply, FastifyRequest } from "fastify";
import { deleteUserService } from "./deleteUserService.js";
import type { DeleteUserParams } from "@repo/types";

export const deleteUserHandler = async (
  request: FastifyRequest<{ Params: DeleteUserParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ userId: request.params.id }, "Deleting user...");

  const prisma = request.server.prisma;
  const deleted = await deleteUserService(prisma, request.params.id);

  if (!deleted) {
    log.warn({ userId: request.params.id }, "User not found");
    return reply.status(404).send({
      code: "USER_NOT_FOUND",
      message: "User not found",
    });
  }

  log.info("User deleted successfully");
  return reply.status(200).send({
    message: "User deleted successfully",
    id: request.params.id,
  });
};
