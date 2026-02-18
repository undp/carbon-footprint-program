import type { FastifyZodInstance } from "@/types/fastify.js";
import { getMyOrganizationsRoute } from "@/features/organizations/app/getMyOrganizationsSelectorOptions/route.js";
import { getOrganizationByIdRoute } from "@/features/organizations/app/getOrganizationById/route.js";
import { createOrganizationRoute } from "@/features/organizations/app/createOrganization/route.js";
import { updateOrganizationRoute } from "@/features/organizations/app/updateOrganization/route.js";
import { requestOrganizationAccreditationRoute } from "@/features/organizations/app/requestOrganizationAccreditation/route.js";

export default function organizationsRoutes(fastify: FastifyZodInstance) {
  // Protect all routes with authentication
  fastify.addHook("onRequest", fastify.requireAuth);

  // Register routes
  getMyOrganizationsRoute(fastify, { public: false }); // GET /me
  getOrganizationByIdRoute(fastify, { public: false }); // GET /:id
  createOrganizationRoute(fastify, { public: false }); // POST /
  updateOrganizationRoute(fastify, { public: false }); // PATCH /:id
  requestOrganizationAccreditationRoute(fastify, { public: false }); // POST /:id/accredit
}
