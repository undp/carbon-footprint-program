import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMyOrganizationsRoute } from "@/features/organizations/app/getMyOrganizations/route.js";
import { getOrganizationByIdRoute } from "@/features/organizations/app/getOrganizationById/route.js";
import { createOrganizationRoute } from "@/features/organizations/app/createOrganization/route.js";
import { updateOrganizationRoute } from "@/features/organizations/app/updateOrganization/route.js";
import { requestOrganizationAccreditationRoute } from "@/features/organizations/app/requestOrganizationAccreditation/route.js";

export default function organizationsRoutes(fastify: FastifyZodInstance) {
  // Protect all routes with authentication
  fastify.addHook("onRequest", fastify.requireAuth);

  // Register routes
  getMyOrganizationsRoute(fastify); // GET /me
  getOrganizationByIdRoute(fastify); // GET /:id
  createOrganizationRoute(fastify); // POST /
  updateOrganizationRoute(fastify); // PATCH /:id
  requestOrganizationAccreditationRoute(fastify); // POST /:id/request-accreditation
}
