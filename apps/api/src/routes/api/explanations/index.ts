import type { FastifyZodInstance } from "@/types/fastify.js";
import { getExplanationByIdRoute } from "@/features/explanations/getExplanationById/route.js";

export default function explanationsRoutes(fastify: FastifyZodInstance) {
  getExplanationByIdRoute(fastify);
}
