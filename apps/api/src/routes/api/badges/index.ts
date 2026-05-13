import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getBadgePreviewsRoute } from "@/features/badges/getBadgePreviews/route.js";
import { listBadgesRoute } from "@/features/badges/listBadges/route.js";
import { activateBadgeRoute } from "@/features/badges/activateBadge/route.js";
import { deactivateBadgeRoute } from "@/features/badges/deactivateBadge/route.js";

export default function badgesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getBadgePreviewsRoute]);

  registerRoutes(
    fastify,
    [listBadgesRoute, activateBadgeRoute, deactivateBadgeRoute],
    { defaultSystemRoles: [SystemRole.SUPERADMIN] }
  );
}
