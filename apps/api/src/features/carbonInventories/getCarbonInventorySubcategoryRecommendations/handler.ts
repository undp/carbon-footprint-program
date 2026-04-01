import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventorySubcategoryRecommendationsService } from "./service.js";

export const getCarbonInventorySubcategoryRecommendationsHandler = async (
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

  const result = await getCarbonInventorySubcategoryRecommendationsService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Subcategory recommendations retrieved successfully"
  );
  return reply.status(200).send(result);
};
