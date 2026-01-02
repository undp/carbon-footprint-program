import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { deleteCarbonInventoryLineService } from "./deleteCarbonInventoryLineService.js";
import { DeleteCarbonInventoryLineParamsSchema } from "./deleteCarbonInventoryLineRoute.js";

type DeleteCarbonInventoryLineParams = z.infer<
  typeof DeleteCarbonInventoryLineParamsSchema
>;

export const deleteCarbonInventoryLineHandler = async (
  request: FastifyRequest<{ Params: DeleteCarbonInventoryLineParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryLine" });
  const carbonInventoryId = BigInt(request.params.id);
  const subcategoryId = BigInt(request.params.subcategoryId);
  const lineId = BigInt(request.params.lineId);

  log.info(
    { carbonInventoryId, subcategoryId, lineId },
    "Deleting carbon inventory line..."
  );

  const prisma = request.server.prisma;

  const result = await deleteCarbonInventoryLineService(
    prisma,
    carbonInventoryId,
    subcategoryId,
    lineId
  );

  if (!result.success) {
    if (result.error === "CARBON_INVENTORY_NOT_FOUND") {
      log.warn({ carbonInventoryId }, "Carbon inventory not found");
      return reply.status(404).send({
        code: "CARBON_INVENTORY_NOT_FOUND",
        message: "Carbon inventory not found",
      });
    }

    if (result.error === "SUBCATEGORY_NOT_FOUND") {
      log.warn({ subcategoryId }, "Subcategory not found");
      return reply.status(404).send({
        code: "SUBCATEGORY_NOT_FOUND",
        message: "Subcategory not found",
      });
    }

    if (result.error === "LINE_NOT_FOUND") {
      log.warn({ lineId }, "Line not found");
      return reply.status(404).send({
        code: "LINE_NOT_FOUND",
        message: "Line not found",
      });
    }

    if (result.error === "LINE_NOT_IN_CARBON_INVENTORY") {
      log.warn(
        { carbonInventoryId, lineId },
        "Line does not belong to the carbon inventory"
      );
      return reply.status(422).send({
        code: "LINE_NOT_IN_CARBON_INVENTORY",
        message: "Line does not belong to the carbon inventory",
      });
    }

    if (result.error === "LINE_NOT_IN_SUBCATEGORY") {
      log.warn(
        { subcategoryId, lineId },
        "Line does not belong to the subcategory"
      );
      return reply.status(422).send({
        code: "LINE_NOT_IN_SUBCATEGORY",
        message: "Line does not belong to the subcategory",
      });
    }

    // This shouldn't happen, but TypeScript needs this
    log.error({ error: result.error }, "Unexpected error deleting line");
    return reply.status(500).send({ message: "Internal server error" });
  }

  log.info(
    { carbonInventoryId, subcategoryId, lineId },
    "Carbon inventory line deleted successfully"
  );
  return reply.status(200).send({ message: "Line deleted successfully" });
};
