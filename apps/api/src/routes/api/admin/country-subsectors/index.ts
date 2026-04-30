import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { createCountrySubsectorRoute } from "@/features/countrySubsectors/admin/createCountrySubsector/route.js";
import { getAllAdminCountrySubsectorsRoute } from "@/features/countrySubsectors/admin/getAllAdminCountrySubsectors/route.js";
import { updateCountrySubsectorRoute } from "@/features/countrySubsectors/admin/updateCountrySubsector/route.js";
import { deleteCountrySubsectorRoute } from "@/features/countrySubsectors/admin/deleteCountrySubsector/route.js";
import { restoreCountrySubsectorRoute } from "@/features/countrySubsectors/admin/restoreCountrySubsector/route.js";

export default function adminCountrySubsectorsRoutes(
  fastify: FastifyZodInstance
) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );

  getAllAdminCountrySubsectorsRoute(fastify);
  createCountrySubsectorRoute(fastify);
  updateCountrySubsectorRoute(fastify);
  deleteCountrySubsectorRoute(fastify);
  restoreCountrySubsectorRoute(fastify);
}
