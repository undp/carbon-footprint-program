import type { FastifyReply, FastifyRequest } from "fastify";
import { getReductionPlanService } from "./service.js";

export const getReductionPlanHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "reductionPlan" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting reduction plan for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getReductionPlanService(prisma, carbonInventoryId);

  log.info({ carbonInventoryId }, "Reduction plan retrieved successfully");
  return reply.status(200).send(data);
};

