import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllCategoriesRoute } from "@/features/categories/getAllCategories/route.js";
import { createCategoryRoute } from "@/features/categories/createCategory/route.js";
import { updateCategoryRoute } from "@/features/categories/updateCategory/route.js";
import { deleteCategoryRoute } from "@/features/categories/deleteCategory/route.js";
import { swapCategoryPositionsRoute } from "@/features/categories/swapCategoryPositions/route.js";
import { SystemRole } from "@repo/types";

export default function categoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllCategoriesRoute,
      createCategoryRoute,
      updateCategoryRoute,
      deleteCategoryRoute,
      swapCategoryPositionsRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
