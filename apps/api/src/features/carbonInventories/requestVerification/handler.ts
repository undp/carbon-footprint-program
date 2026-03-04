import type { FastifyReply, FastifyRequest } from "fastify";
import type { RequestVerificationParams } from "@repo/types";
import { requestVerificationService } from "./service.js";

export const requestVerificationHandler = async (
  request: FastifyRequest<{ Params: RequestVerificationParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  log.info("Requesting verification for carbon inventory...");

  const prisma = request.server.prisma;
  const user = request.currentUser;

  await requestVerificationService(prisma, request.params.id, user?.id);

  log.info("Verification request created successfully");
  return reply.status(201).send();
};
