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
  log.info({ slug: request.params.slug }, "Updating explanation...");

  const prisma = request.server.prisma;
  const userIdRaw = request.currentUser?.id;
  const userId =
    typeof userIdRaw === "string" ? BigInt(userIdRaw) : (userIdRaw ?? null);

  const updated = await updateExplanationService(
    prisma,
    request.params.slug,
    request.body,
    userId
  );

  log.info({ slug: request.params.slug }, "Explanation updated successfully");
  return reply.status(200).send(updated);
};
