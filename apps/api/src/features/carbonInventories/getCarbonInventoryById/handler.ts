import type { FastifyReply, FastifyRequest } from "fastify";
import { GetCarbonInventoryByIdParams } from "@repo/types";
import { getCarbonInventoryByIdService } from "./service.js";

export const getCarbonInventoryByIdHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryByIdParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "carbonInventories" });
  const { id } = request.params;
  log.info(`Getting Carbon inventory with ID: ${id}...`);

  const prisma = request.server.prisma;
  const data = await getCarbonInventoryByIdService(prisma, id);

  log.info("Carbon inventory found successfully");
  return reply.status(200).send(data);
};
