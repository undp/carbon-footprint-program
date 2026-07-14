import type { FastifyReply, FastifyRequest } from "fastify";
import type { CompleteOnboardingParams } from "@repo/types";
import { completeOnboardingService } from "./service.js";

export const completeOnboardingHandler = async (
  request: FastifyRequest<{ Params: CompleteOnboardingParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "users" });
  const userId = request.currentUser!.id;
  const { key } = request.params;

  log.info({ userId, key }, "Marking onboarding as completed...");
  await completeOnboardingService(request.server.prisma, userId, key);

  return reply.status(204).send();
};
