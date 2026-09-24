import type { FastifyReply, FastifyRequest } from "fastify";
import { GetEmissionFactorYearsParams } from "@repo/types";
import { getEmissionFactorYearsService } from "./service.js";

export const getEmissionFactorYearsHandler = async (
  request: FastifyRequest<{ Params: GetEmissionFactorYearsParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "emissionFactorYears" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting emission factor years for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getEmissionFactorYearsService(prisma, carbonInventoryId);

  log.info(
    { carbonInventoryId, years: data },
    "Emission factor years retrieved successfully"
  );
  return reply.status(200).send(data);
};
