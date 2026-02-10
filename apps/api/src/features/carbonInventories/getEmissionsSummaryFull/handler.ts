import type { FastifyReply, FastifyRequest } from "fastify";
import { getEmissionsSummaryFullService } from "./service.js";

export const getEmissionsSummaryFullHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "emissionsSummaryFull" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting full emissions summary for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getEmissionsSummaryFullService(prisma, carbonInventoryId);

  log.info(
    { carbonInventoryId },
    "Full emissions summary retrieved successfully"
  );
  return reply.status(200).send(data);
};
