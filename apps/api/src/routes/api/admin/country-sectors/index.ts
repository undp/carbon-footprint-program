import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/database";
import { registerRoutes } from "@/routing/defineRoute.js";
import { createCountrySectorRoute } from "@/features/countrySectors/admin/createCountrySector/route.js";
import { getAllAdminCountrySectorsRoute } from "@/features/countrySectors/admin/getAllAdminCountrySectors/route.js";
import { updateCountrySectorRoute } from "@/features/countrySectors/admin/updateCountrySector/route.js";
import { deleteCountrySectorRoute } from "@/features/countrySectors/admin/deleteCountrySector/route.js";
import { restoreCountrySectorRoute } from "@/features/countrySectors/admin/restoreCountrySector/route.js";

export default function adminCountrySectorsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllAdminCountrySectorsRoute,
      createCountrySectorRoute,
      updateCountrySectorRoute,
      deleteCountrySectorRoute,
      restoreCountrySectorRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
