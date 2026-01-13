import type { FastifyReply, FastifyRequest } from "fastify";
import { createUserService } from "./createUserService.js";
import type { CreateUserBody } from "@repo/types";

export const createUserHandler = async (
  request: FastifyRequest<{ Body: CreateUserBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info("Creating user...");

  const prisma = request.server.prisma;
  const user = await createUserService(prisma, request.body);

  log.info("User created successfully");
  return reply.status(201).send(user);
};
