import type { FastifyZodInstance } from "@/types/fastify.js";
import { getAllOrganizationsRoute } from "@/features/organizations/admin/getAllOrganizations/route.js";
import { getOrganizationKpisRoute } from "@/features/organizations/admin/getOrganizationKpis/route.js";
import { blockOrganizationRoute } from "@/features/organizations/admin/blockOrganization/route.js";
import { unblockOrganizationRoute } from "@/features/organizations/admin/unblockOrganization/route.js";

export default function adminOrganizationsRoutes(fastify: FastifyZodInstance) {
  fastify.addHook("onRequest", fastify.requireAuth);
  getOrganizationKpisRoute(fastify, { public: false });
  getAllOrganizationsRoute(fastify, { public: false });
  blockOrganizationRoute(fastify, { public: false });
  unblockOrganizationRoute(fastify, { public: false });
}
