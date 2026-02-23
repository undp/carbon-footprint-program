import type { FastifyReply, FastifyRequest } from "fastify";
import { getAllUsersService } from "./service.js";

export const getAllUsersHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info("Getting all users...");

  const prisma = request.server.prisma;
  try {
    const users = await getAllUsersService(prisma);

    log.info("Users retrieved successfully");
    return reply.status(200).send(users);
  } catch (error) {
    log.error({ error }, "Failed to retrieve users");
    return reply.status(500).send({
      error: "Failed to retrieve users",
    });
  }
};
