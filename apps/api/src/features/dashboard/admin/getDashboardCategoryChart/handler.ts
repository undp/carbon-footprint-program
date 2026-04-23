import type { FastifyReply, FastifyRequest } from "fastify";
import { getDashboardCategoryChartService } from "./service.js";
import type { GetAdminDashboardCategoryChartQuery } from "@repo/types";

export const getDashboardCategoryChartHandler = async (
  request: FastifyRequest<{ Querystring: GetAdminDashboardCategoryChartQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-dashboard" });
  log.info("Getting dashboard category chart data...");

  const prisma = request.server.prisma;
  const { year } = request.query;
  const result = await getDashboardCategoryChartService(prisma, year);

  log.info("Dashboard category chart data retrieved successfully");
  return reply.status(200).send(result);
};
