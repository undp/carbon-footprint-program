import type { FastifyReply, FastifyRequest } from "fastify";
import { GetCarbonInventoryMethodologyParams } from "@repo/types";
import { getCarbonInventoryMethodologyService } from "./service.js";

export const getCarbonInventoryMethodologyHandler = async (
  request: FastifyRequest<{ Params: GetCarbonInventoryMethodologyParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "methodology" });
  const carbonInventoryId = BigInt(request.params.id);

  log.info(
    { carbonInventoryId },
    "Getting methodology for carbon inventory..."
  );

  const prisma = request.server.prisma;

  const result = await getCarbonInventoryMethodologyService(
    prisma,
    carbonInventoryId
  );

  log.info({ carbonInventoryId }, "Methodology found successfully");
  return reply.status(200).send(result);
};
