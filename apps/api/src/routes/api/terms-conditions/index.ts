import type { FastifyZodInstance } from "@/types/fastify.js";
import { getCurrentTermsConditionsRoute } from "@/features/termsConditions/getCurrentTermsConditions/route.js";
import { streamCurrentTermsConditionsRoute } from "@/features/termsConditions/streamCurrentTermsConditions/route.js";

export default function termsConditionsRoutes(fastify: FastifyZodInstance) {
  getCurrentTermsConditionsRoute(fastify, { allowPublicAccess: true });
  streamCurrentTermsConditionsRoute(fastify, { allowPublicAccess: true });
}
