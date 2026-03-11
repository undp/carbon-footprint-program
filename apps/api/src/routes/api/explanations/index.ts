import type { FastifyZodInstance } from "@/types/fastify.js";
import { getExplanationByIdRoute } from "@/features/explanations/getExplanationById/route.js";

export default function explanationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getExplanationByIdRoute(fastify, { public: true });
}
