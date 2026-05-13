import type { FastifyReply, FastifyRequest } from "fastify";
import { GetMainActivityEquivalenceParams } from "@repo/types";
import { getMainActivityEquivalenceService } from "./service.js";

export const getMainActivityEquivalenceHandler = async (
  request: FastifyRequest<{ Params: GetMainActivityEquivalenceParams }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "mainActivityEquivalence" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting main activity equivalence for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getMainActivityEquivalenceService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Main activity equivalence retrieved successfully"
  );
  return reply.status(200).send(data);
};
