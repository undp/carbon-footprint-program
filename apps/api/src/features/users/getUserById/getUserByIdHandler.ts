import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserByIdService } from "./getUserByIdService.js";
import type { GetUserByIdParams } from "@repo/types";

export const getUserByIdHandler = async (
  request: FastifyRequest<{ Params: GetUserByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ userId: request.params.id }, "Getting user by ID...");

  const prisma = request.server.prisma;
  try {
    const user = await getUserByIdService(prisma, request.params.id);

    if (!user) {
      log.warn({ userId: request.params.id }, "User not found");
      return reply.status(404).send({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    log.info({ userId: request.params.id }, "User retrieved successfully");
    return reply.status(200).send(user);
  } catch (error) {
    log.error({ error, userId: request.params.id }, "Failed to retrieve user");
    return reply.status(500).send({
      error: "Failed to retrieve user",
    });
  }
};
