import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getAllSubcategoriesRoute } from "@/features/subcategories/getAllSubcategories/route.js";
import { deleteSubcategoryRoute } from "@/features/subcategories/deleteSubcategory/route.js";
import { createSubcategoryRoute } from "@/features/subcategories/createSubcategory/route.js";
import { updateSubcategoryRoute } from "@/features/subcategories/updateSubcategory/route.js";
import { SystemRole } from "@repo/types";

export default function subcategoriesRoutes(fastify: FastifyZodInstance) {
  registerRoutes(
    fastify,
    [
      getAllSubcategoriesRoute,
      deleteSubcategoryRoute,
      createSubcategoryRoute,
      updateSubcategoryRoute,
    ],
    { defaultSystemRoles: [SystemRole.SUPERADMIN, SystemRole.ADMIN] }
  );
}
