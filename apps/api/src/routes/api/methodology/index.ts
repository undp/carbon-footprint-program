import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCurrentMethodologyRoute } from "@/features/methodology/getCurrentMethodology/getCurrentMethodologyRoute.js";

export default function methodologyRoutes(fastify: FastifyZodInstance) {
  getCurrentMethodologyRoute(fastify);
}
