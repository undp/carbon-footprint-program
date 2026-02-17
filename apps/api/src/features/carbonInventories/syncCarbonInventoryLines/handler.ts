import type { FastifyReply, FastifyRequest } from "fastify";
import type { SyncCarbonInventoryLinesRequest } from "@repo/types";
import { syncCarbonInventoryLinesService } from "./service.js";

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
  const user = request.currentUser ?? null;

  const result = await syncCarbonInventoryLinesService(
    prisma,
    carbonInventoryId,
    syncRequest,
    user
  );

  log.info(
    {
      carbonInventoryId,
      createdCount: result.created.length,
      updatedCount: result.updated.length,
      deletedCount: result.deleted.length,
    },
    "Carbon inventory lines synced successfully"
  );

  return reply.status(200).send(result);
};
