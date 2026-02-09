import type { FastifyReply, FastifyRequest } from "fastify";
import { deleteUserService } from "./service.js";
import type { DeleteUserParams } from "@repo/types";

export const deleteUserHandler = async (
  request: FastifyRequest<{ Params: DeleteUserParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ userId: request.params.id }, "Deleting user...");

  const prisma = request.server.prisma;
  await deleteUserService(prisma, request.params.id);

  log.info({ userId: request.params.id }, "User deleted successfully");
  return reply.status(200).send({
    message: "User deleted successfully",
    id: request.params.id,
  });
};
