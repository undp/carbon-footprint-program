import type { FastifyReply, FastifyRequest } from "fastify";
import { addSubcategoriesToCarbonInventoryService } from "./service.js";
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
  const user = request.currentUser ?? null;

  const result = await addSubcategoriesToCarbonInventoryService(
    prisma,
    carbonInventoryId,
    subcategoryIds,
    user
  );

  log.info(
    {
      carbonInventoryId,
      added: result.added,
      skipped: result.skipped,
    },
    "Subcategories added to carbon inventory successfully"
  );
  return reply.status(200).send(result);
};
