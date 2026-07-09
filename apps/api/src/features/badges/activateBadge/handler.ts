import type { FastifyReply, FastifyRequest } from "fastify";
import type { ActivateBadgeParams } from "@repo/types";
import { activateBadgeService } from "./service.js";

export const activateBadgeHandler = async (
  request: FastifyRequest<{ Params: ActivateBadgeParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges" });
  const { id } = request.params;

  log.info({ id }, "Activating badge...");
  const data = await activateBadgeService(
    request.server.prisma,
    request.server.storage,
    id
  );

  log.info({ id }, "Badge activated");
  return reply.status(200).send(data);
};
