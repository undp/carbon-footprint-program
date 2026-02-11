import type { FastifyZodInstance } from "@/types/fastify.js";
import { UserRole } from "@/plugins/app/authorizationPlugin.js";
import { getAllOrganizationsRoute } from "@/features/admin/organizations/getAllOrganizations/route.js";
import { toggleOrganizationBlockedRoute } from "@/features/admin/organizations/toggleOrganizationBlocked/route.js";
import { getOrganizationsKpisRoute } from "@/features/admin/organizations/getOrganizationsKpis/route.js";

export default function adminOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([UserRole.ADMIN, UserRole.SUPERADMIN])
  );

  getAllOrganizationsRoute(fastify);
  getOrganizationsKpisRoute(fastify);
  toggleOrganizationBlockedRoute(fastify);
}
