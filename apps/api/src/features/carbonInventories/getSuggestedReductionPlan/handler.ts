import type { FastifyReply, FastifyRequest } from "fastify";
import { getSuggestedReductionPlanService } from "./service.js";

export const getSuggestedReductionPlanHandler = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "suggestedReductionPlan" });
  const carbonInventoryId = request.params.id;

  log.info(
    { carbonInventoryId },
    "Getting suggested reduction plan for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getSuggestedReductionPlanService(
    prisma,
    carbonInventoryId
  );

  log.info(
    { carbonInventoryId },
    "Suggested reduction plan retrieved successfully"
  );
  return reply.status(200).send(data);
};
