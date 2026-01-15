import type { FastifyReply, FastifyRequest } from "fastify";
import { toggleManualTotalEmissionsService } from "./toggleManualTotalEmissionsService.js";
import type { ToggleManualTotalEmissionsRequest } from "@repo/types";

interface ToggleManualTotalEmissionsParams {
  id: string;
  subcategoryId: string;
}

export const toggleManualTotalEmissionsHandler = async (
  request: FastifyRequest<{
    Params: ToggleManualTotalEmissionsParams;
    Body: ToggleManualTotalEmissionsRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventorySubcategories" });
  const carbonInventoryId = BigInt(request.params.id);
  const subcategoryId = BigInt(request.params.subcategoryId);
  const { activated } = request.body;

  log.info(
    { carbonInventoryId, subcategoryId, activated },
    "Toggling manual total emissions mode..."
  );

  const prisma = request.server.prisma;

  const result = await toggleManualTotalEmissionsService(
    prisma,
    carbonInventoryId,
    subcategoryId,
    activated
  );

  if (!result.success) {
    switch (result.error) {
      case "CARBON_INVENTORY_NOT_FOUND":
        log.warn({ carbonInventoryId }, "Carbon inventory not found");
        return reply.status(404).send({
          code: "CARBON_INVENTORY_NOT_FOUND",
          message: "Carbon inventory not found",
        });

      case "SUBCATEGORY_NOT_FOUND":
        log.warn({ subcategoryId }, "Subcategory not found");
        return reply.status(404).send({
          code: "SUBCATEGORY_NOT_FOUND",
          message: "Subcategory not found",
        });

      case "SUBCATEGORY_NOT_IN_METHODOLOGY":
        log.warn(
          { carbonInventoryId, subcategoryId },
          "Subcategory does not belong to the inventory methodology"
        );
        return reply.status(422).send({
          code: "SUBCATEGORY_NOT_IN_METHODOLOGY",
          message: "Subcategory does not belong to the inventory methodology",
        });

      case "NO_ACTIVE_LINES_TO_CONVERT":
        log.warn(
          { carbonInventoryId, subcategoryId },
          "No active lines to convert to manual mode"
        );
        return reply.status(422).send({
          code: "NO_ACTIVE_LINES_TO_CONVERT",
          message:
            "There are no active lines in this subcategory to convert to manual mode",
        });

      case "MANUAL_MODE_ALREADY_ACTIVE":
        log.warn(
          { carbonInventoryId, subcategoryId },
          "Manual mode is already active for this subcategory"
        );
        return reply.status(422).send({
          code: "MANUAL_MODE_ALREADY_ACTIVE",
          message: "Manual mode is already active for this subcategory",
        });

      case "MANUAL_MODE_NOT_ACTIVE":
        log.warn(
          { carbonInventoryId, subcategoryId },
          "Manual mode is not active for this subcategory"
        );
        return reply.status(422).send({
          code: "MANUAL_MODE_NOT_ACTIVE",
          message: "Manual mode is not active for this subcategory",
        });

      case "NO_LINES_TO_RESTORE":
        log.warn(
          { carbonInventoryId, subcategoryId },
          "No lines to restore from manual mode"
        );
        return reply.status(422).send({
          code: "NO_LINES_TO_RESTORE",
          message:
            "There are no previous lines to restore for this subcategory",
        });

      default:
        log.error(
          { error: result.error },
          "Unexpected error toggling manual mode"
        );
        return reply.status(500).send({ message: "Internal server error" });
    }
  }

  log.info(
    { carbonInventoryId, subcategoryId, activated },
    "Manual total emissions mode toggled successfully"
  );
  return reply.status(204).send();
};
