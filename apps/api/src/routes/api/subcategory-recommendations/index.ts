import type { FastifyZodInstance } from "@/types/fastify.js";
import { listSubcategoryRecommendationsRoute } from "@/features/subcategoryRecommendations/listSubcategoryRecommendations/route.js";
import { createSubcategoryRecommendationRoute } from "@/features/subcategoryRecommendations/createSubcategoryRecommendation/route.js";
import { updateSubcategoryRecommendationRoute } from "@/features/subcategoryRecommendations/updateSubcategoryRecommendation/route.js";
import { SystemRole } from "@repo/types";

export default function subcategoryRecommendationsRoutes(
  fastify: FastifyZodInstance
): void {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  listSubcategoryRecommendationsRoute(fastify);
  createSubcategoryRecommendationRoute(fastify);
  updateSubcategoryRecommendationRoute(fastify);
}
