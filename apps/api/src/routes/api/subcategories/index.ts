import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllSubcategoriesRoute } from "@/features/subcategories/getAllSubcategories/route.js";
import { createSubcategoryRoute } from "@/features/subcategories/createSubcategory/route.js";
import { deleteSubcategoryRoute } from "@/features/subcategories/deleteSubcategory/route.js";

export default function subcategoriesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getAllSubcategoriesRoute(fastify);
  createSubcategoryRoute(fastify);
  deleteSubcategoryRoute(fastify);
}
