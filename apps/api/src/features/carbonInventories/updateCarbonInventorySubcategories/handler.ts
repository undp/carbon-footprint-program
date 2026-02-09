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

  log.info(
    {
      carbonInventoryId,
      added: result.added,
      removed: result.removed,
      skipped: result.skipped,
    },
    "Carbon inventory subcategories updated successfully"
  );
  return reply.status(200).send(result);
};
