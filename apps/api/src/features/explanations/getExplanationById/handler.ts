import type { FastifyReply, FastifyRequest } from "fastify";
import { getExplanationByIdService } from "./service.js";
import type { GetExplanationByIdParams } from "@repo/types";

export const getExplanationByIdHandler = async (
  request: FastifyRequest<{ Params: GetExplanationByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "explanations" });
  log.info(
    { explanationId: request.params.id },
    "Getting explanation by ID..."
  );

  const prisma = request.server.prisma;
  const explanation = await getExplanationByIdService(
    prisma,
    request.params.id
  );

  log.info(
    { explanationId: request.params.id },
    "Explanation retrieved successfully"
  );
  return reply.status(200).send(explanation);
};
