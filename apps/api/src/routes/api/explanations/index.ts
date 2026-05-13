import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getExplanationBySlugRoute } from "@/features/explanations/getExplanationBySlug/route.js";

export default function explanationsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [getExplanationBySlugRoute]);
}
