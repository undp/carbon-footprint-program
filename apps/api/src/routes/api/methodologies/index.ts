import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllMethodologiesRoute } from "@/features/methodologies/getAllMethodologies/route.js";
import { getMethodologyByIdRoute } from "@/features/methodologies/getMethodologyById/route.js";
import { getMethodologyExportRoute } from "@/features/methodologies/getMethodologyExport/route.js";
import { createMethodologyRoute } from "@/features/methodologies/createMethodology/route.js";
import { updateMethodologyRoute } from "@/features/methodologies/updateMethodology/route.js";
import { deleteMethodologyRoute } from "@/features/methodologies/deleteMethodology/route.js";
import { duplicateMethodologyRoute } from "@/features/methodologies/duplicateMethodology/route.js";
import { SystemRole } from "@repo/types";

export default function methodologiesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllMethodologiesRoute,
      getMethodologyByIdRoute,
      getMethodologyExportRoute,
      createMethodologyRoute,
      updateMethodologyRoute,
      deleteMethodologyRoute,
      duplicateMethodologyRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
