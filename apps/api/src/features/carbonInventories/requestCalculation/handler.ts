import type { FastifyReply, FastifyRequest } from "fastify";
import type { RequestCalculationParams } from "@repo/types";
import { requestCalculationService } from "./service.js";

export const requestCalculationHandler = async (
  request: FastifyRequest<{ Params: RequestCalculationParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  log.info("Requesting calculation for carbon inventory...");

  const prisma = request.server.prisma;
  const user = request.currentUser;

  await requestCalculationService(prisma, request.params.id, user?.id);

  log.info("Calculation request created successfully");
  return reply.status(201).send();
};
