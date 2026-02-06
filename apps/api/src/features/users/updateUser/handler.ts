import type { FastifyReply, FastifyRequest } from "fastify";
import { updateUserService } from "./service.js";
import type { UpdateUserBody, UpdateUserParams } from "@repo/types";

export const updateUserHandler = async (
  request: FastifyRequest<{ Params: UpdateUserParams; Body: UpdateUserBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ userId: request.params.id }, "Updating user...");

  const prisma = request.server.prisma;
  const user = await updateUserService(prisma, request.params.id, request.body);

  log.info({ userId: request.params.id }, "User updated successfully");
  return reply.status(200).send(user);
};
