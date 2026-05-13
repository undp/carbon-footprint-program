import type { FastifyReply, FastifyRequest } from "fastify";
import { GetSubcategoriesRankingParams } from "@repo/types";
import { getSubcategoriesRankingService } from "./service.js";

export const getSubcategoriesRankingHandler = async (
  request: FastifyRequest<{ Params: GetSubcategoriesRankingParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "subcategoriesRanking" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting subcategories ranking for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getSubcategoriesRankingService(prisma, carbonInventoryId);

  log.info(
    { carbonInventoryId },
    "Subcategories ranking retrieved successfully"
  );
  return reply.status(200).send(data);
};
