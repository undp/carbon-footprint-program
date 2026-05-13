import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getDashboardKpisRoute } from "@/features/dashboard/admin/getDashboardKpis/route.js";
import { getDashboardSectorChartRoute } from "@/features/dashboard/admin/getDashboardSectorChart/route.js";
import { getDashboardCategoryChartRoute } from "@/features/dashboard/admin/getDashboardCategoryChart/route.js";
import { SystemRole } from "@repo/database";

export default function adminDashboardRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getDashboardKpisRoute,
      getDashboardSectorChartRoute,
      getDashboardCategoryChartRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
