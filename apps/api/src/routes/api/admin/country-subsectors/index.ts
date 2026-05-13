import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { registerRoutes } from "@/routing/defineRoute.js";
import { createCountrySubsectorRoute } from "@/features/countrySubsectors/admin/createCountrySubsector/route.js";
import { getAllAdminCountrySubsectorsRoute } from "@/features/countrySubsectors/admin/getAllAdminCountrySubsectors/route.js";
import { updateCountrySubsectorRoute } from "@/features/countrySubsectors/admin/updateCountrySubsector/route.js";
import { deleteCountrySubsectorRoute } from "@/features/countrySubsectors/admin/deleteCountrySubsector/route.js";
import { restoreCountrySubsectorRoute } from "@/features/countrySubsectors/admin/restoreCountrySubsector/route.js";

export default function adminCountrySubsectorsRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(
    fastify,
    [
      getAllAdminCountrySubsectorsRoute,
      createCountrySubsectorRoute,
      updateCountrySubsectorRoute,
      deleteCountrySubsectorRoute,
      restoreCountrySubsectorRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
