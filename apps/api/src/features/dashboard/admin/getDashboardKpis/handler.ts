import type { FastifyReply, FastifyRequest } from "fastify";
import { getDashboardKpisService } from "./service.js";
import type { GetAdminDashboardKpisQuery } from "@repo/types";

export const getDashboardKpisHandler = async (
  request: FastifyRequest<{ Querystring: GetAdminDashboardKpisQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-dashboard" });
  log.info("Getting dashboard KPIs...");

  const prisma = request.server.prisma;
  const { year } = request.query;
  const result = await getDashboardKpisService(prisma, year);

  log.info("Dashboard KPIs retrieved successfully");
  return reply.status(200).send(result);
};
