import type { FastifyReply, FastifyRequest } from "fastify";
import { getSubcategoryRecommendationsService } from "./service.js";

export const getSubcategoryRecommendationsHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventorySubcategoryRecommendations",
  });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting subcategory recommendations for carbon inventory..."
  );

  const prisma = request.server.prisma;

  const result = await getSubcategoryRecommendationsService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Subcategory recommendations retrieved successfully"
  );
  return reply.status(200).send(result);
};
