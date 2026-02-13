import type { FastifyZodInstance } from "@/types/fastify.js";
import { createCategoryRoute } from "@/features/categories/createCategory/route.js";
import { deleteCategoryRoute } from "@/features/categories/deleteCategory/route.js";

export default function categoriesRoutes(fastify: FastifyZodInstance) {
  // fastify.addHook("onRequest", fastify.requireAuth);
  createCategoryRoute(fastify);
  deleteCategoryRoute(fastify);
}
