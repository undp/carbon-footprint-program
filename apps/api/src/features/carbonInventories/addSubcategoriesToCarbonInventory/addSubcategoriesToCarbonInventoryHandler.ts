import type { FastifyReply, FastifyRequest } from "fastify";
import { addSubcategoriesToCarbonInventoryService } from "./addSubcategoriesToCarbonInventoryService.js";
import type { AddSubcategoriesToCarbonInventoryBody } from "@repo/types";

interface AddSubcategoriesToCarbonInventoryParams {
  id: string;
}

export const addSubcategoriesToCarbonInventoryHandler = async (
  request: FastifyRequest<{
    Params: AddSubcategoriesToCarbonInventoryParams;
    Body: AddSubcategoriesToCarbonInventoryBody;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventory" });
  const carbonInventoryId = BigInt(request.params.id);
  const subcategoryIds = request.body.subcategoryIds.map((id) => BigInt(id));

  log.info(
    { carbonInventoryId, subcategoryIds },
    "Adding subcategories to carbon inventory..."
  );

  const prisma = request.server.prisma;

  const result = await addSubcategoriesToCarbonInventoryService(
    prisma,
    carbonInventoryId,
    subcategoryIds
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

    if (result.error === "SUBCATEGORY_NOT_FOUND") {
      log.warn({ subcategoryIds }, "One or more subcategories not found");
      return reply.status(404).send({
        code: "SUBCATEGORY_NOT_FOUND",
        message: "One or more subcategories not found",
      });
    }

    if (result.error === "SUBCATEGORY_NOT_IN_METHODOLOGY") {
      log.warn(
        { carbonInventoryId, subcategoryIds },
        "One or more subcategories do not belong to the carbon inventory's methodology"
      );
      return reply.status(422).send({
        code: "SUBCATEGORY_NOT_IN_METHODOLOGY",
        message:
          "One or more subcategories do not belong to the carbon inventory's methodology",
      });
    }

    // This shouldn't happen, but TypeScript needs this
    log.error({ error: result.error }, "Unexpected error adding subcategories");
    return reply.status(500).send({ message: "Internal server error" });
  }

  log.info(
    {
      carbonInventoryId,
      added: result.data.added,
      skipped: result.data.skipped,
    },
    "Subcategories added to carbon inventory successfully"
  );
  return reply.status(200).send(result.data);
};
