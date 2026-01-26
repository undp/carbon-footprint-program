import type { FastifyReply, FastifyRequest } from "fastify";
import type { SyncCarbonInventoryLinesRequest } from "@repo/types";
import { syncCarbonInventoryLinesService } from "./syncCarbonInventoryLinesService.js";

interface SyncCarbonInventoryLinesParams {
  id: string;
}

export const syncCarbonInventoryLinesHandler = async (
  request: FastifyRequest<{
    Params: SyncCarbonInventoryLinesParams;
    Body: SyncCarbonInventoryLinesRequest;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryLines" });
  const carbonInventoryId = BigInt(request.params.id);
  const syncRequest = request.body;

  log.info(
    {
      carbonInventoryId,
      createCount: syncRequest.create.length,
      updateCount: syncRequest.update.length,
      deleteCount: syncRequest.delete.length,
    },
    "Syncing carbon inventory lines..."
  );

  const prisma = request.server.prisma;

  const result = await syncCarbonInventoryLinesService(
    prisma,
    carbonInventoryId,
    syncRequest
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
        log.warn({ carbonInventoryId }, "Subcategory not found");
        return reply.status(404).send({
          code: "SUBCATEGORY_NOT_FOUND",
          message: "Subcategory not found",
        });
      case "SUBCATEGORY_NOT_IN_METHODOLOGY":
        log.warn(
          { carbonInventoryId },
          "Subcategory does not belong to the carbon inventory's methodology"
        );
        return reply.status(422).send({
          code: "SUBCATEGORY_NOT_IN_METHODOLOGY",
          message:
            "Subcategory does not belong to the carbon inventory's methodology",
        });
      case "LINE_NOT_FOUND":
        log.warn({ carbonInventoryId }, "Line not found");
        return reply.status(404).send({
          code: "LINE_NOT_FOUND",
          message: "Line not found",
        });
      case "LINE_NOT_IN_CARBON_INVENTORY":
        log.warn(
          { carbonInventoryId },
          "Line does not belong to this carbon inventory"
        );
        return reply.status(422).send({
          code: "LINE_NOT_IN_CARBON_INVENTORY",
          message: "Line does not belong to this carbon inventory",
        });
      default:
        log.error({ carbonInventoryId, error: result.error }, "Unknown error");
        return reply.status(500).send({
          code: "UNKNOWN_ERROR",
          message: "Unknown error",
        });
    }
  }

  log.info(
    {
      carbonInventoryId,
      createdCount: result.data.created.length,
      updatedCount: result.data.updated.length,
      deletedCount: result.data.deleted.length,
    },
    "Carbon inventory lines synced successfully"
  );

  return reply.status(200).send(result.data);
};
