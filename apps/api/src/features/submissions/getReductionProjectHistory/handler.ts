import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetReductionProjectHistoryParams } from "@repo/types";
import { getReductionProjectHistoryService } from "./service.js";

export const getReductionProjectHistoryHandler = async (
  request: FastifyRequest<{ Params: GetReductionProjectHistoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching reduction project submission history...");

  const result = await getReductionProjectHistoryService(
    request.server.prisma,
    request.server.storage,
    request.params.id
  );

  log.info("Reduction project submission history fetched");
  return reply.status(200).send(result);
};
