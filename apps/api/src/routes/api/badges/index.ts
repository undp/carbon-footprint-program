import type { FastifyZodInstance } from "@/types/fastify.js";
import { getBadgePreviewsRoute } from "@/features/badges/getBadgePreviews/route.js";

export default function badgesRoutes(fastify: FastifyZodInstance) {
  getBadgePreviewsRoute(fastify);
}
