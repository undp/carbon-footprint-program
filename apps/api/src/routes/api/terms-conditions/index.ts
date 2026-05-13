import type { FastifyZodInstance } from "@/types/fastify.js";
import { registerRoutes } from "@/routing/defineRoute.js";
import { getCurrentTermsConditionsRoute } from "@/features/termsConditions/getCurrentTermsConditions/route.js";
import { streamCurrentTermsConditionsRoute } from "@/features/termsConditions/streamCurrentTermsConditions/route.js";

export default function termsConditionsRoutes(fastify: FastifyZodInstance) {
  registerRoutes(fastify, [
    getCurrentTermsConditionsRoute,
    streamCurrentTermsConditionsRoute,
  ]);
}
