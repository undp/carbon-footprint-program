import type { FastifyRequest, FastifyReply } from "fastify";
import { getCurrentTermsConditionsService } from "./service.js";

export const getCurrentTermsConditionsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const result = await getCurrentTermsConditionsService(request.server.prisma);
  return reply.status(200).send(result);
};
