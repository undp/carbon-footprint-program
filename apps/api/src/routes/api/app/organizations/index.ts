import type { FastifyZodInstance } from "@/types/fastify.js";
import { submitAccreditationRequestRoute } from "@/features/app/organizations/submitAccreditationRequest/route.js";
import { getOrganizationByIdRoute } from "@/features/app/organizations/getOrganizationById/route.js";
import { getMyOrganizationsRoute } from "@/features/app/organizations/getMyOrganizations/route.js";
import { createOrganizationRoute } from "@/features/app/organizations/createOrganization/route.js";
import { updateOrganizationRoute } from "@/features/app/organizations/updateOrganization/route.js";

export default function appOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);

  getMyOrganizationsRoute(fastify);
  getOrganizationByIdRoute(fastify);
  updateOrganizationRoute(fastify);
  submitAccreditationRequestRoute(fastify);
  createOrganizationRoute(fastify);
}
