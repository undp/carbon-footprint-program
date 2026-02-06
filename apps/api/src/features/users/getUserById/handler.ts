import type { FastifyReply, FastifyRequest } from "fastify";
import { getUserByIdService } from "./service.js";
import type { GetUserByIdParams } from "@repo/types";

export const getUserByIdHandler = async (
  request: FastifyRequest<{ Params: GetUserByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ userId: request.params.id }, "Getting user by ID...");

  const prisma = request.server.prisma;
  const user = await getUserByIdService(prisma, request.params.id);

  log.info({ userId: request.params.id }, "User retrieved successfully");
  return reply.status(200).send(user);
};
