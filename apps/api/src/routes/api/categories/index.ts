import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCategoriesRoute } from "@/features/categories/getAllCategories/route.js";
import { createCategoryRoute } from "@/features/categories/createCategory/route.js";
import { updateCategoryRoute } from "@/features/categories/updateCategory/route.js";
import { deleteCategoryRoute } from "@/features/categories/deleteCategory/route.js";
import { swapCategoryPositionsRoute } from "@/features/categories/swapCategoryPositions/route.js";
import { SystemRole } from "@repo/types";

export default function categoriesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  fastify.addHook(
    "preHandler",
    fastify.requireRoles([SystemRole.SUPERADMIN, SystemRole.ADMIN])
  );
  getAllCategoriesRoute(fastify);
  createCategoryRoute(fastify);
  updateCategoryRoute(fastify);
  deleteCategoryRoute(fastify);
  swapCategoryPositionsRoute(fastify);
}
