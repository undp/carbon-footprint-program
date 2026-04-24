import type { FastifyReply, FastifyRequest } from "fastify";
import type { CreateSubcategoryRecommendationBody } from "@repo/types";
import { createSubcategoryRecommendationService } from "./service.js";

export const createSubcategoryRecommendationHandler = async (
  request: FastifyRequest<{ Body: CreateSubcategoryRecommendationBody }>,
  reply: FastifyReply
): Promise<void> => {
  const data = await createSubcategoryRecommendationService(
    request.server.prisma,
    request.body,
    request.currentUser ?? null
  );
  return reply.status(201).send(data);
};
