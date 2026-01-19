import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@repo/database";
import { updateUserService } from "./updateUserService.js";
import type { UpdateUserBody, UpdateUserParams } from "@repo/types";

export const updateUserHandler = async (
  request: FastifyRequest<{ Params: UpdateUserParams; Body: UpdateUserBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ userId: request.params.id }, "Updating user...");

  const prisma = request.server.prisma;

  try {
    const user = await updateUserService(prisma, request.params.id, request.body);

    if (!user) {
      log.warn({ userId: request.params.id }, "User not found");
      return reply.status(404).send({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    log.info("User updated successfully");
    return reply.status(200).send(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation (e.g., duplicate email)
        log.warn({ userId: request.params.id }, "Email already in use");
        return reply.status(422).send({
          code: "EMAIL_ALREADY_IN_USE",
          message: "Email already in use",
        });
      }
    }
    throw error;
  }
};
