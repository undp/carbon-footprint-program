import type { FastifyReply, FastifyRequest } from "fastify";
import type { UpdateSubcategoryRecommendationRequest } from "@repo/types";
import { updateSubcategoryRecommendationService } from "./service.js";

export const updateSubcategoryRecommendationHandler = async (
  request: FastifyRequest<{
    Body: UpdateSubcategoryRecommendationRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "subcategoryRecommendations" });
  log.info("Updating subcategory recommendation group...");

  const data = await updateSubcategoryRecommendationService(
    request.server.prisma,
    request.body,
    request.currentUser ?? null
  );

  log.info("Subcategory recommendation group updated successfully");
  return reply.status(200).send(data);
};
