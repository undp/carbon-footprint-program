import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { getAllSubcategoryRecommendationsRoute } from "@/features/subcategoryRecommendations/getAllSubcategoryRecommendations/route.js";
import { createSubcategoryRecommendationRoute } from "@/features/subcategoryRecommendations/createSubcategoryRecommendation/route.js";
import { updateSubcategoryRecommendationRoute } from "@/features/subcategoryRecommendations/updateSubcategoryRecommendation/route.js";

export default function subcategoryRecommendationsRoutes(
  fastify: FastifyZodInstance
) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );

  getAllSubcategoryRecommendationsRoute(fastify);
  createSubcategoryRecommendationRoute(fastify);
  updateSubcategoryRecommendationRoute(fastify);
}
