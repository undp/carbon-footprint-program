import type { FastifyReply, FastifyRequest } from "fastify";
import { GetCarbonInventorySubcategoriesSummaryParams } from "@repo/types";
import { getCarbonInventorySubcategoriesSummaryService } from "./service.js";

export const getCarbonInventorySubcategoriesSummaryHandler = async (
  request: FastifyRequest<{
    Params: GetCarbonInventorySubcategoriesSummaryParams;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventorySubcategoriesSummary",
  });
  const carbonInventoryId = BigInt(request.params.id);

  log.info(
    { carbonInventoryId },
    "Getting subcategories summary for carbon inventory..."
  );

  const prisma = request.server.prisma;

  const result = await getCarbonInventorySubcategoriesSummaryService(
    prisma,
    carbonInventoryId
  );

  log.info({ carbonInventoryId }, "Subcategories summary found successfully");
  return reply.status(200).send(result);
};
