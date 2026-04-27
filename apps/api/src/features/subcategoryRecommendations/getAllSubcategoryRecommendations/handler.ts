import type { FastifyReply, FastifyRequest } from "fastify";
import { listSubcategoryRecommendationsService } from "./service.js";

export const listSubcategoryRecommendationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "subcategoryRecommendations" });
  log.info("Listing subcategory recommendations...");

  const data = await listSubcategoryRecommendationsService(
    request.server.prisma
  );

  log.info("Subcategory recommendations listed successfully");
  return reply.status(200).send(data);
};
