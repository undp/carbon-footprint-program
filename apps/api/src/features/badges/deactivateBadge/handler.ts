import type { FastifyReply, FastifyRequest } from "fastify";
import type { DeactivateBadgeParams } from "@repo/types";
import { deactivateBadgeService } from "./service.js";

export const deactivateBadgeHandler = async (
  request: FastifyRequest<{ Params: DeactivateBadgeParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges" });
  const { id } = request.params;

  log.info({ id }, "Deactivating badge...");
  const data = await deactivateBadgeService(
    request.server.prisma,
    request.server.storage,
    id
  );

  log.info({ id }, "Badge deactivated");
  return reply.status(200).send(data);
};
