import type { FastifyZodInstance } from "@/types/fastify.js";
import { UserRole } from "@/plugins/app/authorizationPlugin.js";
import { getAdminOrganizationsRoute } from "@/features/organizations/getAdminOrganizations/route.js";
import { toggleOrganizationBlockedRoute } from "@/features/organizations/toggleOrganizationBlocked/route.js";
import { getAdminOrganizationsKpisRoute } from "@/features/organizations/getAdminOrganizationsKpis/route.js";

export default function adminOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([UserRole.ADMIN, UserRole.SUPERADMIN])
  );

  getAdminOrganizationsRoute(fastify);
  getAdminOrganizationsKpisRoute(fastify);
  toggleOrganizationBlockedRoute(fastify);
}
