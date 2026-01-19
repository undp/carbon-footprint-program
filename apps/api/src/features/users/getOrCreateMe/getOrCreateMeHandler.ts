import type { FastifyReply, FastifyRequest } from "fastify";
import { getOrCreateMeService } from "./getOrCreateMeService.js";
import type { GetOrCreateMeBody } from "@repo/types";

export const getOrCreateMeHandler = async (
  request: FastifyRequest<{ Body: GetOrCreateMeBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  log.info({ idpUserId: request.body.idpUserId }, "Finding user by idpUserId or email...");

  const prisma = request.server.prisma;
  const user = await getOrCreateMeService(prisma, request.body);

  if (!user) {
    log.info("User not found, returning null");
    return reply.status(200).send(null);
  }

  log.info({ userId: user.id }, "User found and retrieved successfully");
  return reply.status(200).send(user);
};
