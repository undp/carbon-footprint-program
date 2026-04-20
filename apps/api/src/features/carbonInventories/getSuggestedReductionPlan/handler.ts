import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  GetSuggestedReductionPlanParams,
  GetSuggestedReductionPlanQuery,
} from "@repo/types";
import { getSuggestedReductionPlanService } from "./service.js";
import { DEFAULT_SUGGESTED_INITIATIVES_LIMIT } from "./constants.js";

export const getSuggestedReductionPlanHandler = async (
  request: FastifyRequest<{
    Params: GetSuggestedReductionPlanParams;
    Querystring: GetSuggestedReductionPlanQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "suggestedReductionPlan" });
  const carbonInventoryId = request.params.id;
  const limit = request.query.limit
    ? parseInt(request.query.limit, 10)
    : DEFAULT_SUGGESTED_INITIATIVES_LIMIT;

  log.info(
    { carbonInventoryId, limit },
    "Getting suggested reduction plan for carbon inventory..."
  );

  const prisma = request.server.prisma;
  const data = await getSuggestedReductionPlanService(
    prisma,
    carbonInventoryId,
    limit
  );

  log.info(
    { carbonInventoryId, count: data.length },
    "Suggested reduction plan retrieved successfully"
  );
  return reply.status(200).send(data);
};
