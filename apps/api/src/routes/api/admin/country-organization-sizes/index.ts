import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { registerRoutes } from "@/routing/defineRoute.js";
import { createCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/createCountryOrganizationSize/route.js";
import { getAllAdminCountryOrganizationSizesRoute } from "@/features/countryOrganizationSizes/admin/getAllAdminCountryOrganizationSizes/route.js";
import { updateCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/updateCountryOrganizationSize/route.js";
import { deleteCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/deleteCountryOrganizationSize/route.js";
import { restoreCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/restoreCountryOrganizationSize/route.js";
import { swapCountryOrganizationSizePositionsRoute } from "@/features/countryOrganizationSizes/admin/swapCountryOrganizationSizePositions/route.js";

export default function adminCountryOrganizationSizesRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(
    fastify,
    [
      getAllAdminCountryOrganizationSizesRoute,
      createCountryOrganizationSizeRoute,
      updateCountryOrganizationSizeRoute,
      deleteCountryOrganizationSizeRoute,
      restoreCountryOrganizationSizeRoute,
      swapCountryOrganizationSizePositionsRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
