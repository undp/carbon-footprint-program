import type { FastifyReply, FastifyRequest } from "fastify";
import { getTerritoryLevelsService } from "./service.js";

export const getTerritoryLevelsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "territories" });
  log.info("Getting territory levels...");

  const data = await getTerritoryLevelsService(request.server.prisma);

  log.info(`Territory levels found successfully (${data.length} levels)`);

  return reply.status(200).send(data);
};
