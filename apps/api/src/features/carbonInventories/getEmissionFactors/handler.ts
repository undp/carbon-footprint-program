import type { FastifyReply, FastifyRequest } from "fastify";
import { GetEmissionFactorsParams } from "@repo/types";
import { getEmissionFactorsService } from "./service.js";

export const getEmissionFactorsHandler = async (
  request: FastifyRequest<{ Params: GetEmissionFactorsParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "emissionFactors" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting emission factors for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getEmissionFactorsService(prisma, carbonInventoryId);

  log.info({ carbonInventoryId }, "Emission factors retrieved successfully");
  return reply.status(200).send(data);
};
