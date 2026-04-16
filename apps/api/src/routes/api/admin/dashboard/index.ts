import type { FastifyZodInstance } from "@/types/fastify.js";
import { getDashboardKpisRoute } from "@/features/dashboard/admin/getDashboardKpis/route.js";
import { getDashboardSectorChartRoute } from "@/features/dashboard/admin/getDashboardSectorChart/route.js";
import { getDashboardCategoryChartRoute } from "@/features/dashboard/admin/getDashboardCategoryChart/route.js";
import { SystemRole } from "@repo/database";

export default function adminDashboardRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  getDashboardKpisRoute(fastify);
  getDashboardSectorChartRoute(fastify);
  getDashboardCategoryChartRoute(fastify);
}
