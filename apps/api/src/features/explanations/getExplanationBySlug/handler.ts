import type { FastifyReply, FastifyRequest } from "fastify";
import { getExplanationBySlugService } from "./service.js";
import type { GetExplanationBySlugParams } from "@repo/types";

export const getExplanationBySlugHandler = async (
  request: FastifyRequest<{ Params: GetExplanationBySlugParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "explanations" });
  log.info(
    { explanationSlug: request.params.slug },
    "Getting explanation by slug..."
  );

  const prisma = request.server.prisma;
  const explanation = await getExplanationBySlugService(
    prisma,
    request.params.slug
  );

  log.info(
    { explanationSlug: request.params.slug },
    "Explanation retrieved successfully"
  );
  return reply.status(200).send(explanation);
};
