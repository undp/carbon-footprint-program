import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { createCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/createCountryOrganizationSize/route.js";
import { getAllAdminCountryOrganizationSizesRoute } from "@/features/countryOrganizationSizes/admin/getAllAdminCountryOrganizationSizes/route.js";
import { updateCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/updateCountryOrganizationSize/route.js";
import { deleteCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/deleteCountryOrganizationSize/route.js";
import { restoreCountryOrganizationSizeRoute } from "@/features/countryOrganizationSizes/admin/restoreCountryOrganizationSize/route.js";
import { swapCountryOrganizationSizePositionsRoute } from "@/features/countryOrganizationSizes/admin/swapCountryOrganizationSizePositions/route.js";

export default function adminCountryOrganizationSizesRoutes(
  fastify: FastifyZodInstance
) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );

  getAllAdminCountryOrganizationSizesRoute(fastify);
  createCountryOrganizationSizeRoute(fastify);
  updateCountryOrganizationSizeRoute(fastify);
  deleteCountryOrganizationSizeRoute(fastify);
  restoreCountryOrganizationSizeRoute(fastify);
  swapCountryOrganizationSizePositionsRoute(fastify);
}
