import type { FastifyZodInstance } from "@/types/fastify.js";
import { getOrganizationFormFieldsRoute } from "@/features/forms/organizations/route.js";

/**
 * Routes for /api/forms
 */
export default function formsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  // Register routes
  getOrganizationFormFieldsRoute(fastify);
}
