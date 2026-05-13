import type { FastifyReply, FastifyRequest } from "fastify";
import { GetEmissionsSummaryCategoriesParams } from "@repo/types";
import { getEmissionsSummaryCategoriesService } from "./service.js";

export const getEmissionsSummaryCategoriesHandler = async (
  request: FastifyRequest<{ Params: GetEmissionsSummaryCategoriesParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "emissionsSummaryCategories" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting emissions summary categories for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getEmissionsSummaryCategoriesService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Emissions summary categories retrieved successfully"
  );
  return reply.status(200).send(data);
};
