import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { addOrganizationUserRoute } from "@/features/organizations/app/addOrganizationUser/route.js";
import { getOrganizationUsersRoute } from "@/features/organizations/app/getOrganizationUsers/route.js";
import { updateOrganizationUserRoleRoute } from "@/features/organizations/app/updateOrganizationUserRole/route.js";
import { removeOrganizationUserRoute } from "@/features/organizations/app/removeOrganizationUser/route.js";
import { getMyOrganizationsRoute } from "@/features/organizations/app/getMyOrganizationsSelectorOptions/route.js";
import { getOrganizationByIdRoute } from "@/features/organizations/app/getOrganizationById/route.js";
import { createOrganizationRoute } from "@/features/organizations/app/createOrganization/route.js";
import { updateOrganizationRoute } from "@/features/organizations/app/updateOrganization/route.js";
import { requestOrganizationAccreditationRoute } from "@/features/organizations/app/requestOrganizationAccreditation/route.js";
import { getOrganizationRecognitionsRoute } from "@/features/organizations/app/getOrganizationRecognitions/route.js";
import { SystemRole } from "@repo/types";

export default function appOrganizationsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      // Org. ADMIN
      updateOrganizationRoute,
      requestOrganizationAccreditationRoute,
      addOrganizationUserRoute,
      updateOrganizationUserRoleRoute,
      removeOrganizationUserRoute,

      // ORG. ADMIN, CONTRIBUTOR, VIEWER
      getOrganizationUsersRoute,
      getOrganizationByIdRoute,
      getOrganizationRecognitionsRoute,

      // AUTHENTICATED (No organization membership required)
      getMyOrganizationsRoute,
      createOrganizationRoute,
    ],
    {
      defaultSystemRoles: [
        SystemRole.SUPERADMIN,
        SystemRole.ADMIN,
        SystemRole.USER,
      ],
    }
  );
}
