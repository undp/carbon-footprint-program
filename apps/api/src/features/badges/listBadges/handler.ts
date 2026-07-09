import type { FastifyReply, FastifyRequest } from "fastify";
import { listBadgesService } from "./service.js";

export const listBadgesHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "badges" });

  log.info("Listing badges...");
  const data = await listBadgesService(
    request.server.prisma,
    request.server.storage
  );

  log.info("Badges listed successfully");
  return reply.status(200).send(data);
};
