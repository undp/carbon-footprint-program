import type { FastifyReply, FastifyRequest } from "fastify";
import type { AdminDashboardKpisQuery } from "@repo/types";
import { getDashboardKpisService } from "./service.js";

export const getDashboardKpisHandler = async (
  request: FastifyRequest<{ Querystring: AdminDashboardKpisQuery }>,
  reply: FastifyReply
) => {
  const log = request.log.child({ module: "admin-dashboard" });
  log.info("Getting dashboard KPIs...");

  const prisma = request.server.prisma;
  const result = await getDashboardKpisService(prisma, request.query.year);

  log.info("Dashboard KPIs retrieved successfully");
  return reply.status(200).send(result);
};
