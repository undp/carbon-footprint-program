import type { FastifyReply, FastifyRequest } from "fastify";
import { getCarbonInventorySubcategoriesSummaryService } from "./getCarbonInventorySubcategoriesSummaryService.js";

export const getCarbonInventorySubcategoriesSummaryHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
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

  if (!result.success) {
    if (result.error === "CARBON_INVENTORY_NOT_FOUND") {
      log.warn({ carbonInventoryId }, "Carbon inventory not found");
      return reply.status(404).send({
        code: "CARBON_INVENTORY_NOT_FOUND",
        message: "Carbon inventory not found",
      });
    }

    if (result.error === "METHODOLOGY_NOT_FOUND") {
      log.warn(
        { carbonInventoryId },
        "Methodology not found for carbon inventory"
      );
      return reply.status(404).send({
        code: "METHODOLOGY_NOT_FOUND",
        message: "Methodology not found",
      });
    }

    log.warn(
      { carbonInventoryId },
      "Error getting subcategories summary for carbon inventory"
    );
    return reply.status(500).send({
      message: "Error getting subcategories summary for carbon inventory",
    });
  }

  log.info({ carbonInventoryId }, "Subcategories summary found successfully");
  return reply.status(200).send(result.data);
};
