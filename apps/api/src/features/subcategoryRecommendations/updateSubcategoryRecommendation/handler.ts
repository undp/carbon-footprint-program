import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateSubcategoryRecommendationBody,
  UpdateSubcategoryRecommendationQuery,
} from "@repo/types";
import { updateSubcategoryRecommendationService } from "./service.js";

export const updateSubcategoryRecommendationHandler = async (
  request: FastifyRequest<{
    Querystring: UpdateSubcategoryRecommendationQuery;
    Body: UpdateSubcategoryRecommendationBody;
  }>,
  reply: FastifyReply
): Promise<void> => {
  const data = await updateSubcategoryRecommendationService(
    request.server.prisma,
    request.query,
    request.body,
    request.currentUser ?? null
  );
  return reply.status(200).send(data);
};
