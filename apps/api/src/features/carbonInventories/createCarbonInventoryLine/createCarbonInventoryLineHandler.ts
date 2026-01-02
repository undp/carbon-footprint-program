import type { FastifyReply, FastifyRequest } from "fastify";
import { createCarbonInventoryLineService } from "./createCarbonInventoryLineService.js";

interface CreateCarbonInventoryLineParams {
  id: string;
  subcategoryId: string;
}

export const createCarbonInventoryLineHandler = async (
  request: FastifyRequest<{ Params: CreateCarbonInventoryLineParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventoryLine" });
  const carbonInventoryId = BigInt(request.params.id);
  const subcategoryId = BigInt(request.params.subcategoryId);

  log.info(
    { carbonInventoryId, subcategoryId },
    "Creating carbon inventory line..."
  );

  const prisma = request.server.prisma;

  const result = await createCarbonInventoryLineService(
    prisma,
    carbonInventoryId,
    subcategoryId
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
      log.warn({ subcategoryId }, "Subcategory not found");
      return reply.status(404).send({
        code: "SUBCATEGORY_NOT_FOUND",
        message: "Subcategory not found",
      });
    }

    if (result.error === "SUBCATEGORY_NOT_IN_METHODOLOGY") {
      log.warn(
        { carbonInventoryId, subcategoryId },
        "Subcategory does not belong to the carbon inventory's methodology"
      );
      return reply.status(422).send({
        code: "SUBCATEGORY_NOT_IN_METHODOLOGY",
        message:
          "Subcategory does not belong to the carbon inventory's methodology",
      });
    }

    // This shouldn't happen, but TypeScript needs this
    log.error({ error: result.error }, "Unexpected error creating line");
    return reply.status(500).send({ message: "Internal server error" });
  }

  log.info(
    { carbonInventoryId, subcategoryId, lineId: result.data.id },
    "Carbon inventory line created successfully"
  );
  return reply.status(201).send(result.data);
};
