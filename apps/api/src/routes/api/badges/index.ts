import type { FastifyZodInstance } from "@/types/fastify.js";
import { getBadgePreviewsRoute } from "@/features/badges/getBadgePreviews/route.js";
import { SystemRole } from "@repo/types";

export default function badgesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([
      SystemRole.SUPERADMIN,
      SystemRole.ADMIN,
      SystemRole.USER,
    ])
  );

  getBadgePreviewsRoute(fastify);
}
