import type { FastifyReply, FastifyRequest } from "fastify";
import { listSubcategoryRecommendationsService } from "./service.js";

export const listSubcategoryRecommendationsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const data = await listSubcategoryRecommendationsService(
    request.server.prisma
  );
  return reply.status(200).send(data);
};
