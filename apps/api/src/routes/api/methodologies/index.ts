import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMethodologiesRoute } from "@/features/methodologies/getAllMethodologies/getAllMethodologiesRoute.js";
import { deleteMethodologyRoute } from "@/features/methodologies/deleteMethodology/deleteMethodologyRoute.js";

export default function methodologiesRoutes(fastify: FastifyZodInstance) {
  // fastify.addHook("onRequest", fastify.requireAuth);
  getAllMethodologiesRoute(fastify);
  deleteMethodologyRoute(fastify);
}
