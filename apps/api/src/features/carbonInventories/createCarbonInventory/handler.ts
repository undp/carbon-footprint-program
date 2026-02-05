import type { FastifyReply, FastifyRequest } from "fastify";
import { createCarbonInventoryService } from "./service.js";
import type { CreateCarbonInventoryRequest } from "@repo/types";

export const createCarbonInventoryHandler = async (
  request: FastifyRequest<{ Body: CreateCarbonInventoryRequest }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  log.info("Creating carbon inventory...");

  const prisma = request.server.prisma;
  const result = await createCarbonInventoryService(prisma, request.body);

  if (!result.success) {
    log.warn(
      { error: result.error },
      "Failed to create carbon inventory: no active methodology"
    );
    return reply.status(422).send(result.error);
  }

  log.info("Carbon inventory created successfully");
  return reply.status(201).send(result.data);
};
