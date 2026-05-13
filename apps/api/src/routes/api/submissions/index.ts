import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getCarbonInventoryHistoryRoute } from "@/features/submissions/getCarbonInventoryHistory/route.js";
import { getOrganizationHistoryRoute } from "@/features/submissions/getOrganizationHistory/route.js";
import { getReductionProjectHistoryRoute } from "@/features/submissions/getReductionProjectHistory/route.js";
import { SystemRole } from "@repo/types";

export default function submissionsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getCarbonInventoryHistoryRoute,
      getOrganizationHistoryRoute,
      getReductionProjectHistoryRoute,
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
