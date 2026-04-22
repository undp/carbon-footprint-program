import type { FastifyZodInstance } from "@/types/fastify.js";
import { getExplanationBySlugRoute } from "@/features/explanations/getExplanationBySlug/route.js";

export default function explanationsRoutes(fastify: FastifyZodInstance) {
  getExplanationBySlugRoute(fastify, { public: true });
}
