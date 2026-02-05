import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllMethodologiesRoute } from "@/features/methodologies/getAllMethodologies/getAllMethodologiesRoute.js";

export default function methodologiesRoutes(fastify: FastifyZodInstance) {
  // fastify.addHook("onRequest", fastify.requireAuth);
  getAllMethodologiesRoute(fastify);
}
