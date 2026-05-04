import type { FastifyReply, FastifyRequest } from "fastify";
import { updateMyProfileService } from "./service.js";
import type { UpdateMyProfileBody } from "@repo/types";

export const updateMyProfileHandler = async (
  request: FastifyRequest<{ Body: UpdateMyProfileBody }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  const userId = request.currentUser!.id;

  log.info({ userId }, "Updating own profile...");

  const updatedUser = await updateMyProfileService(
    request.server.prisma,
    userId,
    request.body
  );

  log.info({ userId }, "Profile updated successfully");
  return reply.status(200).send(updatedUser);
};
