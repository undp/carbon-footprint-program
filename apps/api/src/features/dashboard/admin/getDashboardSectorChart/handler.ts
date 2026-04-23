import type { FastifyReply, FastifyRequest } from "fastify";
import { getDashboardSectorChartService } from "./service.js";
import type { GetAdminDashboardSectorChartQuery } from "@repo/types";

export const getDashboardSectorChartHandler = async (
  request: FastifyRequest<{ Querystring: GetAdminDashboardSectorChartQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-dashboard" });
  log.info("Getting dashboard sector chart data...");

  const prisma = request.server.prisma;
  const { limit, year } = request.query;
  const result = await getDashboardSectorChartService(prisma, limit, year);

  log.info("Dashboard sector chart data retrieved successfully");
  return reply.status(200).send(result);
};
