import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllUsersService } from "./getAllUsersService.js";

export const getAllUsersHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info("Getting all users...");

  const prisma = request.server.prisma;
  const users = await getAllUsersService(prisma);

  log.info("Users retrieved successfully");
  return reply.status(200).send(users);
};
