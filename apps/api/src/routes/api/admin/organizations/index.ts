import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllOrganizationsRoute } from "@/features/organizations/admin/getAllOrganizations/route.js";
import { getOrganizationKpisRoute } from "@/features/organizations/admin/getOrganizationKpis/route.js";
import { blockOrganizationRoute } from "@/features/organizations/admin/blockOrganization/route.js";
import { unblockOrganizationRoute } from "@/features/organizations/admin/unblockOrganization/route.js";
import { SystemRole } from "@repo/database";

export default function adminOrganizationsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getOrganizationKpisRoute,
      getAllOrganizationsRoute,
      blockOrganizationRoute,
      unblockOrganizationRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
