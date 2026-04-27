import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateExplanationParams,
  UpdateExplanationRequest,
} from "@repo/types";
import { updateExplanationService } from "./service.js";

export const updateExplanationHandler = async (
  request: FastifyRequest<{
    Params: UpdateExplanationParams;
    Body: UpdateExplanationRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-explanations" });
  const { slug } = request.params;
  log.info(`Updating explanation ${slug}...`);

  const prisma = request.server.prisma;
  const user = request.currentUser ?? null;

  await updateExplanationService(prisma, slug, request.body, user);

  log.info(`Explanation ${slug} updated successfully`);
  return reply.status(204).send();
};
