import { Prisma } from "@repo/database";
import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  UpdateCarbonInventoryParams,
  UpdateCarbonInventoryRequest,
  UpdateCarbonInventoryResponse,
} from "@repo/types";
import { updateCarbonInventoryService } from "./updateCarbonInventoryService.js";

export const updateCarbonInventoryHandler = async (
  request: FastifyRequest<{
    Params: UpdateCarbonInventoryParams;
    Body: UpdateCarbonInventoryRequest;
  }>,
  reply: FastifyReply
): Promise<UpdateCarbonInventoryResponse | void> => {
  const log = request.log.child({ module: "carbonInventories" });
  const prisma = request.server.prisma;
  const { id } = request.params;

  try {
    const updatedInventory = await updateCarbonInventoryService(
      prisma,
      id,
      request.body
    );
    log.info(`Carbon inventory ${id} updated successfully`);
    return reply.status(200).send(updatedInventory);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      log.warn(`Carbon inventory ${id} not found`);
      return reply.notFound("Carbon inventory not found");
    }

    log.error({ err: error }, "Error updating carbon inventory");
    throw error;
  }
};

