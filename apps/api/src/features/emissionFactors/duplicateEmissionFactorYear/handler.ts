import type { FastifyReply, FastifyRequest } from "fastify";
import type { DuplicateEmissionFactorYearRequest } from "@repo/types";
import { duplicateEmissionFactorYearService } from "./service.js";

export const duplicateEmissionFactorYearHandler = async (
  request: FastifyRequest<{ Body: DuplicateEmissionFactorYearRequest }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "emissionFactors" });
  const { methodologyVersionId, sourceYear, targetYear, changes } =
    request.body;

  log.info(
    { methodologyVersionId, sourceYear, targetYear, changes: changes.length },
    "Copying emission factors into another year..."
  );

  const result = await duplicateEmissionFactorYearService(
    request.server.prisma,
    request.body,
    request.currentUser ?? null
  );

  log.info(
    { methodologyVersionId, sourceYear, targetYear, ...result },
    "Emission factors copied into another year"
  );
  return reply.status(200).send(result);
};
