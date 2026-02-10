import type { FastifyZodInstance } from "@/types/fastify.js";
import { UserRole } from "@/plugins/app/authorizationPlugin.js";
import { GetAllOrganizationsRoute } from "@/features/admin/organizations/getOrganizations/route.js";
import { toggleOrganizationBlockedRoute } from "@/features/admin/organizations/toggleOrganizationBlocked/route.js";
import { GetOrganizationsKpisRoute } from "@/features/admin/organizations/getOrganizationsKpis/route.js";

export default function adminOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([UserRole.ADMIN, UserRole.SUPERADMIN])
  );

  GetAllOrganizationsRoute(fastify);
  GetOrganizationsKpisRoute(fastify);
  toggleOrganizationBlockedRoute(fastify);
}
