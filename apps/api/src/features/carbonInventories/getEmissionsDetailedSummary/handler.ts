import type { FastifyReply, FastifyRequest } from "fastify";
import { GetEmissionsDetailedSummaryParams } from "@repo/types";
import { getEmissionsDetailedSummaryService } from "./service.js";

export const getEmissionsDetailedSummaryHandler = async (
  request: FastifyRequest<{ Params: GetEmissionsDetailedSummaryParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "emissionsDetailedSummary" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting full emissions summary for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getEmissionsDetailedSummaryService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Full emissions summary retrieved successfully"
  );
  return reply.status(200).send(data);
};
