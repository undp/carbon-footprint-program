import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetOrganizationHistoryParams } from "@repo/types";
import { getOrganizationHistoryService } from "./service.js";

export const getOrganizationHistoryHandler = async (
  request: FastifyRequest<{ Params: GetOrganizationHistoryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "submissions" });
  log.info("Fetching organization submission history...");

  const result = await getOrganizationHistoryService(
    request.server.prisma,
    request.server.storage,
    request.params.id
  );

  log.info("Organization submission history fetched");
  return reply.status(200).send(result);
};
