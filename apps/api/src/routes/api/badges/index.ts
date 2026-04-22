import type { FastifyZodInstance } from "@/types/fastify.js";
import { getBadgePreviewsRoute } from "@/features/badges/getBadgePreviews/route.js";
import { listBadgesRoute } from "@/features/badges/listBadges/route.js";
import { activateBadgeRoute } from "@/features/badges/activateBadge/route.js";
import { deactivateBadgeRoute } from "@/features/badges/deactivateBadge/route.js";
import { SystemRole } from "@repo/types";

export default function badgesRoutes(fastify: FastifyZodInstance) {
  getBadgePreviewsRoute(fastify);

  // SUPERADMIN-only badge management endpoints
  fastify.register(
    (adminFastify) => {
      adminFastify.addHook(
        "preHandler",
        adminFastify.requireRoles([SystemRole.SUPERADMIN])
      );
      listBadgesRoute(adminFastify);
      activateBadgeRoute(adminFastify);
      deactivateBadgeRoute(adminFastify);
    }
  );
}
