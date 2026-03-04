import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllSubcategoriesRoute } from "@/features/subcategories/getAllSubcategories/route.js";

export default function subcategoriesRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getAllSubcategoriesRoute(fastify);
}
