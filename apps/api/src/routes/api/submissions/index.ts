import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCarbonInventoryHistoryRoute } from "@/features/submissions/getCarbonInventoryHistory/route.js";
import { getOrganizationHistoryRoute } from "@/features/submissions/getOrganizationHistory/route.js";
import { getReductionProjectHistoryRoute } from "@/features/submissions/getReductionProjectHistory/route.js";
import { SystemRole } from "@repo/types";

export default function submissionsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([
      SystemRole.SUPERADMIN,
      SystemRole.ADMIN,
      SystemRole.USER,
    ])
  );

  getCarbonInventoryHistoryRoute(fastify);
  getOrganizationHistoryRoute(fastify);
  getReductionProjectHistoryRoute(fastify);
}
