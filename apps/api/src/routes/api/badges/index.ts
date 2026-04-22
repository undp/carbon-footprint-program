import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { getBadgePreviewsRoute } from "@/features/badges/getBadgePreviews/route.js";
import { listBadgesRoute } from "@/features/badges/listBadges/route.js";
import { activateBadgeRoute } from "@/features/badges/activateBadge/route.js";
import { deactivateBadgeRoute } from "@/features/badges/deactivateBadge/route.js";

export default function badgesRoutes(fastify: FastifyZodInstance) {
  getBadgePreviewsRoute(fastify);

  fastify.register((f) => {
    f.addHook("onRequest", f.requireAuth);
    f.addHook("preHandler", f.requireRoles([SystemRole.SUPERADMIN]));
    listBadgesRoute(f);
    activateBadgeRoute(f);
    deactivateBadgeRoute(f);
  });
}
