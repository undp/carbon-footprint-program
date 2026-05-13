import type { FastifyReply, FastifyRequest } from "fastify";
import { GetSectorRankingParams } from "@repo/types";
import { getSectorRankingService } from "./service.js";

export const getSectorRankingHandler = async (
  request: FastifyRequest<{ Params: GetSectorRankingParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "sectorRanking" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting sector ranking for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getSectorRankingService(prisma, carbonInventoryId);

  log.info({ carbonInventoryId }, "Sector ranking retrieved successfully");
  return reply.status(200).send(data);
};
