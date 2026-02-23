import type { FastifyReply, FastifyRequest } from "fastify";
import { getMeService } from "./service.js";
import type { GetMeBody } from "@repo/types";

export const getMeHandler = async (
  request: FastifyRequest<{ Body: GetMeBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });

  if (!request.authUser) {
    log.info("No authenticated user found, returning null");
    return reply.status(200).send(null);
  }

  log.info(
    { idpUserId: request.authUser?.idpUserId },
    "Finding user by idpUserId..."
  );

  const prisma = request.server.prisma;
  try {
    const user = await getMeService(prisma, {
      idpUserId: request.authUser?.idpUserId,
    });

    if (!user) {
      log.info("User not found, returning null");
      return reply.status(200).send(null);
    }

    log.info({ userId: user.id }, "User found and retrieved successfully");
    return reply.status(200).send(user);
  } catch (error) {
    log.error(
      { error, idpUserId: request.authUser?.idpUserId },
      "Failed to get or create user"
    );
    return reply.status(500).send({
      error: "Failed to get or create user",
    });
  }
};
