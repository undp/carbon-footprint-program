import type { FastifyZodInstance } from "@/types/fastify.js";
import { SystemRole } from "@repo/types";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllSubcategoryRecommendationsRoute } from "@/features/subcategoryRecommendations/getAllSubcategoryRecommendations/route.js";
import { createSubcategoryRecommendationRoute } from "@/features/subcategoryRecommendations/createSubcategoryRecommendation/route.js";
import { updateSubcategoryRecommendationRoute } from "@/features/subcategoryRecommendations/updateSubcategoryRecommendation/route.js";

export default function subcategoryRecommendationsRoutes(
  fastify: FastifyZodInstance
) {
  registerRoutes(
    fastify,
    [
      getAllSubcategoryRecommendationsRoute,
      createSubcategoryRecommendationRoute,
      updateSubcategoryRecommendationRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
