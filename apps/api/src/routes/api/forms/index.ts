import type { FastifyZodInstance } from "@/types/fastify.js";
import { getOrganizationFormFieldsRoute } from "@/features/forms/organizations/route.js";

/**
 * Routes for /api/forms
 */
export default function formsRoutes(fastify: FastifyZodInstance) {
  // Register routes
  getOrganizationFormFieldsRoute(fastify); // GET /organizations
}
