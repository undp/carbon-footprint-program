import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { registerRoutes } from "@/routing/defineRoute.js";
import { createOrganizationMainActivityRoute } from "@/features/organizationMainActivities/admin/createOrganizationMainActivity/route.js";
import { getAllAdminOrganizationMainActivitiesRoute } from "@/features/organizationMainActivities/admin/getAllAdminOrganizationMainActivities/route.js";
import { updateOrganizationMainActivityRoute } from "@/features/organizationMainActivities/admin/updateOrganizationMainActivity/route.js";
import { deleteOrganizationMainActivityRoute } from "@/features/organizationMainActivities/admin/deleteOrganizationMainActivity/route.js";
import { restoreOrganizationMainActivityRoute } from "@/features/organizationMainActivities/admin/restoreOrganizationMainActivity/route.js";

export default function adminOrganizationMainActivitiesRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(
    fastify,
    [
      getAllAdminOrganizationMainActivitiesRoute,
      createOrganizationMainActivityRoute,
      updateOrganizationMainActivityRoute,
      deleteOrganizationMainActivityRoute,
      restoreOrganizationMainActivityRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
