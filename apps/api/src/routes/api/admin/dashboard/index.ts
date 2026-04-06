import type { FastifyZodInstance } from "@/types/fastify.js";
import { getDashboardKpisRoute } from "@/features/adminDashboard/getDashboardKpis/route.js";
import { SystemRole } from "@repo/database";

export default function adminDashboardRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  getDashboardKpisRoute(fastify);
}
