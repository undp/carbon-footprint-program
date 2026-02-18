import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllCategoriesRoute } from "@/features/categories/getAllCategories/route.js";
import { createCategoryRoute } from "@/features/categories/createCategory/route.js";
import { updateCategoryRoute } from "@/features/categories/updateCategory/route.js";
import { deleteCategoryRoute } from "@/features/categories/deleteCategory/route.js";

export default function categoriesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getAllCategoriesRoute(fastify);
  createCategoryRoute(fastify);
  updateCategoryRoute(fastify);
  deleteCategoryRoute(fastify);
}
