import type { FastifyReply, FastifyRequest } from "fastify";
import { updateCarbonInventorySubcategoriesService } from "./service.js";
import type { UpdateCarbonInventorySubcategoriesRequest } from "@repo/types";

interface UpdateCarbonInventorySubcategoriesParams {
  id: string;
}

export const updateCarbonInventorySubcategoriesHandler = async (
  request: FastifyRequest<{
    Params: UpdateCarbonInventorySubcategoriesParams;
    Body: UpdateCarbonInventorySubcategoriesRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventory" });
  const carbonInventoryId = BigInt(request.params.id);

  log.info(
    { carbonInventoryId, subcategoryCount: request.body.length },
    "Updating carbon inventory subcategories..."
  );

  const prisma = request.server.prisma;

  const result = await updateCarbonInventorySubcategoriesService(
    prisma,
    carbonInventoryId,
    request.body
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
      log.warn({ carbonInventoryId }, "One or more subcategories not found");
      return reply.status(404).send({
        code: "SUBCATEGORY_NOT_FOUND",
        message: "One or more subcategories not found",
      });
    }

    if (result.error === "SUBCATEGORY_NOT_IN_METHODOLOGY") {
      log.warn(
        { carbonInventoryId },
        "One or more subcategories do not belong to the carbon inventory's methodology"
      );
      return reply.status(422).send({
        code: "SUBCATEGORY_NOT_IN_METHODOLOGY",
        message:
          "One or more subcategories do not belong to the carbon inventory's methodology",
      });
    }

    if (result.error === "SUBCATEGORY_HAS_NON_EMPTY_LINES") {
      log.warn(
        { carbonInventoryId },
        "Cannot remove subcategory with non-empty lines"
      );
      return reply.status(422).send({
        code: "SUBCATEGORY_HAS_NON_EMPTY_LINES",
        message:
          "Cannot remove subcategory with non-empty lines. Please delete or empty the lines first.",
      });
    }

    // This shouldn't happen, but TypeScript needs this
    log.error(
      { error: result.error },
      "Unexpected error updating subcategories"
    );
    return reply.status(500).send({ message: "Internal server error" });
  }

  log.info(
    {
      carbonInventoryId,
      added: result.data.added,
      removed: result.data.removed,
      skipped: result.data.skipped,
    },
    "Carbon inventory subcategories updated successfully"
  );
  return reply.status(200).send(result.data);
};
