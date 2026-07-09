import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryHistoryParams } from "@repo/types";
import { getCarbonInventoryHistoryService } from "./service.js";

export const getCarbonInventoryHistoryHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryHistoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching carbon inventory submission history...");

  const result = await getCarbonInventoryHistoryService(
    request.server.prisma,
    request.server.storage,
    request.params.id
  );

  log.info("Carbon inventory submission history fetched");
  return reply.status(200).send(result);
};
