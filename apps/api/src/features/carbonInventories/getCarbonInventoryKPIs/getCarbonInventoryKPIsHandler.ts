import type { FastifyReply, FastifyRequest } from "fastify";
import type { GetCarbonInventoryKPIsQuery } from "@repo/types";
import { getCarbonInventoryKPIsService } from "./getCarbonInventoryKPIsService.js";

export const getCarbonInventoryKPIsHandler = async (
  request: FastifyRequest<{
    Querystring: GetCarbonInventoryKPIsQuery;
  }>,
  reply: FastifyReply
) => {
  const log = request.log.child({
    module: "carbonInventoryKPIs",
  });

  const { year } = request.query;

  log.info({ year }, "Getting carbon inventory KPIs...");

  const prisma = request.server.prisma;

  try {
    const result = await getCarbonInventoryKPIsService(prisma, year);

    if (!result.success) {
      log.error("Error getting carbon inventory KPIs");
      return reply.status(500).send({
        code: "INTERNAL_ERROR",
        message: "Error getting carbon inventory KPIs",
      });
    }

    log.info("Carbon inventory KPIs retrieved successfully");
    return reply.status(200).send(result.data);
  } catch (err) {
    log.error({ err }, "Error getting carbon inventory KPIs");
    return reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "Error getting carbon inventory KPIs",
    });
  }
};
